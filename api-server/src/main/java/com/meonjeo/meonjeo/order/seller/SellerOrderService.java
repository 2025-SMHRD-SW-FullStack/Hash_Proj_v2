package com.meonjeo.meonjeo.order.seller;

import com.meonjeo.meonjeo.common.OrderStatus;
import com.meonjeo.meonjeo.common.ShipmentStatus;
import com.meonjeo.meonjeo.order.*;
import com.meonjeo.meonjeo.order.seller.dto.*;
import com.meonjeo.meonjeo.shipment.Shipment;
import com.meonjeo.meonjeo.shipment.ShipmentRepository;
import com.meonjeo.meonjeo.shipping.OrderShipment;
import com.meonjeo.meonjeo.shipping.OrderShipmentRepository;
import com.meonjeo.meonjeo.shipping.ShipmentEvent;
import com.meonjeo.meonjeo.shipping.ShipmentEventRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;

import static org.springframework.http.HttpStatus.NOT_FOUND;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class SellerOrderService {

    private final OrderRepository orderRepo;
    private final OrderItemRepository orderItemRepo;
    private final OrderShipmentRepository orderShipmentRepo;
    private final ShipmentEventRepository shipmentRepo;
    private final DeliveryAutoConfirmService autoConfirm;
    private final ShipmentRepository shipmentRepository;


    // ===== 그리드 조회 =====
    public Page<SellerOrderGridRow> listGridForSeller(
            Long sellerId, OrderStatus status, LocalDate from, LocalDate to, String q, Pageable pageable
    ) {
        LocalDateTime fromTs = (from == null) ? null : from.atStartOfDay();
        LocalDateTime toTs   = (to   == null) ? null : to.plusDays(1).atStartOfDay();

        Page<Order> orders = orderRepo.searchForSeller(sellerId, status, fromTs, toTs, normalize(q), pageable);
        if (orders.isEmpty()) return Page.empty(pageable);

        List<Long> orderIds = orders.stream().map(Order::getId).toList();

        // 아이템(상품명 요약)
        List<OrderItem> items = orderItemRepo.findByOrderIdInAndSellerId(orderIds, sellerId);
        Map<Long, String> productSummary = summarizeProductNames(items);

        // 송장(택배사/송장, 최신 1개 기준 노출)
        List<OrderShipment> shipments = orderShipmentRepo.findByOrderIdInAndSellerId(orderIds, sellerId);
        Map<Long, OrderShipment> latestShipmentByOrder = shipments.stream()
                .collect(Collectors.groupingBy(OrderShipment::getOrderId,
                        Collectors.collectingAndThen(Collectors.maxBy(Comparator.comparingLong(OrderShipment::getId)),
                                opt -> opt.orElse(null))));

        // 상태(배송 타임라인 원문)
        Map<Long, String> statusTextByOrder = computeStatusTexts(orders.getContent(), latestShipmentByOrder);

        List<SellerOrderGridRow> content = orders.stream().map(o -> {
            OrderShipment s = latestShipmentByOrder.get(o.getId());
            String addr = joinAddr(o.getAddr1(), o.getAddr2(), o.getZipcode());
            String feedback = feedbackDday(o.getDeliveredAt(), 7);

            return new SellerOrderGridRow(
                    o.getId(),
                    o.getOrderUid(),
                    o.getCreatedAt(),
                    statusTextByOrder.getOrDefault(o.getId(), mapOrderStatus(o.getStatus())),
                    (s == null ? null : s.getCourierName()),
                    (s == null ? null : s.getTrackingNo()),
                    feedback,
                    productSummary.getOrDefault(o.getId(), ""),
                    o.getReceiver(),
                    addr,
                    o.getPhone(),
                    o.getRequestMemo()
            );
        }).toList();

        return new PageImpl<>(content, pageable, orders.getTotalElements());
    }

    // ===== 송장 등록/수정 =====
    @Transactional
    public Long registerShipment(Long sellerId, Long orderId, RegisterShipmentRequest req) {
        // 권한: 내 상품이 포함된 주문인지
        boolean has = orderRepo.existsForSeller(orderId, sellerId);
        if (!has) throw new ResponseStatusException(NOT_FOUND, "Order not found for this seller");

        OrderShipment os = OrderShipment.builder()
                .orderId(orderId)
                .sellerId(sellerId)
                .courierCode(req.courierCode())
                .courierName(req.courierName())
                .trackingNo(req.trackingNo())
                .build();
        orderShipmentRepo.save(os);

        Shipment sm = shipmentRepository.findByOrderId(orderId).orElseGet(Shipment::new);
        if (sm.getId() == null) {
            sm.setOrderId(orderId);
            sm.setSellerId(sellerId);
            sm.setStatus(ShipmentStatus.READY);
        }
        sm.setCourierCode(normalizeCourierCode(req.courierCode(), req.courierName())); // 숫자코드로 정규화
        sm.setTrackingNo(req.trackingNo());
        sm.setLastSyncedAt(LocalDateTime.now());
        shipmentRepository.save(sm);

        ShipmentEvent ev0 = ShipmentEvent.builder()
                .orderId(orderId)
                .courierCode(req.courierCode())
                .courierName(req.courierName())
                .trackingNo(req.trackingNo())
                .statusCode("REGISTERED")
                .statusText("송장 등록")
                .occurredAt(LocalDateTime.now())
                .build();
        shipmentRepo.save(ev0);

// [핵심] "이벤트 저장 직후" 두 메서드 호출
        autoConfirm.updateInTransitIfMoved(orderId);
        autoConfirm.updateDeliveredIfComplete(orderId);


        // (선택) 즉시 0번 이벤트 넣거나, 외부 동기화 트리거
        // syncService.enqueue(os.getCourierCode(), os.getTrackingNo());

        return os.getId();
    }

    // ===== 내부 유틸 =====
    private String normalize(String s) {
        if (s == null) return null;
        String t = s.trim();
        return t.isEmpty() ? null : t;
    }

    private Map<Long, String> summarizeProductNames(List<OrderItem> items) {
        Map<Long, List<String>> names = new HashMap<>();
        for (OrderItem i : items) {
            names.computeIfAbsent(i.getOrder().getId(), k -> new ArrayList<>()).add(i.getProductNameSnapshot());
        }
        Map<Long, String> result = new HashMap<>();
        for (Map.Entry<Long, List<String>> e : names.entrySet()) {
            List<String> distinct = e.getValue().stream().distinct().toList();
            if (distinct.isEmpty()) { result.put(e.getKey(), ""); continue; }
            if (distinct.size() == 1) result.put(e.getKey(), distinct.get(0));
            else result.put(e.getKey(), distinct.get(0) + " 외 " + (distinct.size()-1) + "건");
        }
        return result;
    }

    private Map<Long, String> computeStatusTexts(List<Order> orders, Map<Long, OrderShipment> latestShipmentByOrder) {
        Map<Long, String> statusMap = new HashMap<>();
        for (Order o : orders) {
            OrderShipment s = latestShipmentByOrder.get(o.getId());
            if (s == null) {
                statusMap.put(o.getId(), mapOrderStatus(o.getStatus()));
                continue;
            }
            List<String> tnos = latestShipmentByOrder.values().stream()
                    .filter(os -> Objects.equals(os.getOrderId(), o.getId()))
                    .map(os -> os.getTrackingNo() == null ? "" : os.getTrackingNo())
                    .filter(t -> !t.isEmpty())
                    .toList();
            if (tnos.isEmpty()) { statusMap.put(o.getId(), "배송준비중"); continue; }

            List<ShipmentEvent> latest = shipmentRepo.findLatestOneForOrderAndTrackingNos(o.getId(), tnos);
            if (!latest.isEmpty()) {
                ShipmentEvent ev = latest.get(0);
                statusMap.put(o.getId(), ev.getStatusText() != null ? ev.getStatusText() : mapOrderStatus(o.getStatus()));
            } else {
                statusMap.put(o.getId(), "배송준비중");
            }
        }
        return statusMap;
    }

    private String mapOrderStatus(OrderStatus st) {
        return switch (st) {
            case PENDING -> "결제대기";
            case PAID -> "결제완료";
            case READY -> "배송준비중";
            case IN_TRANSIT -> "배송중";
            case DELIVERED -> "배송완료";
            case CONFIRMED -> "구매확정";
        };
    }

    private String joinAddr(String a1, String a2, String zip) {
        String base = (a1 == null ? "" : a1) + (a2 == null || a2.isBlank() ? "" : " " + a2);
        return zip == null || zip.isBlank() ? base : base + " (" + zip + ")";
    }

    private String feedbackDday(LocalDateTime deliveredAt, int windowDays) {
        if (deliveredAt == null) return "-";
        long d = ChronoUnit.DAYS.between(deliveredAt.toLocalDate().atStartOfDay(), LocalDate.now().plusDays(0).atStartOfDay());
        long left = windowDays - d;
        if (left > 0) return "D-" + left;
        if (left == 0) return "D-day";
        return "마감";
    }

    private String normalizeCourierCode(String code, String name) {
        if (code == null) code = "";
        String c = code.trim().toLowerCase();
        String n = (name == null ? "" : name).toLowerCase();
        String s = c + " " + n;
        if (c.matches("^\\d{2}$")) return c;   // 이미 숫자코드면 그대로
        if (s.contains("cj")) return "04";
        if (s.contains("lotte") || s.contains("롯데")) return "05";
        if (s.contains("hanjin") || s.contains("한진")) return "08";
        if (s.contains("logen") || s.contains("로젠")) return "06";
        if (s.contains("post") || s.contains("우체국")) return "01";
        return c; // 모르면 원문 유지
    }
}
