package com.meonjeo.meonjeo.order;

import com.meonjeo.meonjeo.common.OrderStatus;
import com.meonjeo.meonjeo.order.dto.MyOrderDetailResponse;
import com.meonjeo.meonjeo.order.dto.MyOrderItemView;
import com.meonjeo.meonjeo.order.dto.MyOrderSummaryResponse;
import com.meonjeo.meonjeo.order.dto.OrderWindowResponse;
import com.meonjeo.meonjeo.product.Product;
import com.meonjeo.meonjeo.product.ProductRepository;
import com.meonjeo.meonjeo.security.AuthSupport;
import com.meonjeo.meonjeo.shipment.Shipment;
import com.meonjeo.meonjeo.shipment.ShipmentRepository;
import com.meonjeo.meonjeo.shipment.TrackingService;
import com.meonjeo.meonjeo.shipment.dto.TimelineEvent;
import com.meonjeo.meonjeo.shipping.ShipmentEvent;
import com.meonjeo.meonjeo.shipping.ShipmentEventRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Tag(name = "내 주문")
@RestController
@RequestMapping("/api/me/orders")
@RequiredArgsConstructor
public class MyOrderController {

    private final OrderRepository orderRepo;
    private final ProductRepository productRepo;
    private final AuthSupport auth;
    private final OrderWindowService windowService;
    private final ShipmentRepository shipmentRepo;
    private final ShipmentEventRepository shipEventRepo;
    private final TrackingService tracking;



    private Long uid() { return auth.currentUserId(); }

    @Operation(summary = "내 주문 목록")
    @GetMapping
    public List<MyOrderSummaryResponse> list() {
        return orderRepo.findByUserIdOrderByIdDesc(uid()).stream()
                .map(o -> new MyOrderSummaryResponse(
                        o.getId(), o.getOrderUid(), o.getStatus(),
                        o.getTotalPrice(), o.getUsedPoint(), o.getPayAmount(),
                        o.getCreatedAt()
                ))
                .toList();
    }

    @Operation(summary = "내 주문 상세")
    @GetMapping("/{id}")
    public MyOrderDetailResponse detail(@PathVariable Long id) {
        Order o = orderRepo.findByIdAndUserId(id, uid())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "ORDER_NOT_FOUND"));

        // 1. 주문에 포함된 모든 상품 ID를 한 번에 추출합니다.
        List<Long> productIds = o.getItems().stream()
                .map(OrderItem::getProductId)
                .filter(Objects::nonNull)
                .distinct()
                .toList();

        // 2. 모든 Product 정보를 한 번의 쿼리로 가져와 Map으로 만듭니다. (N+1 문제 방지)
        Map<Long, Product> productMap = productRepo.findAllById(productIds).stream()
                .collect(Collectors.toMap(Product::getId, product -> product));

        List<MyOrderItemView> items = o.getItems().stream()
                .map(it -> {
                    // 3. Map에서 상품 정보를 찾아 썸네일 URL을 가져옵니다.
                    Product product = productMap.get(it.getProductId());
                    String thumbnailUrl = (product != null) ? product.getThumbnailUrl() : null;

                    // 4. thumbnailUrl을 포함하여 DTO를 생성합니다.
                    return new MyOrderItemView(
                            it.getId(), it.getProductId(),
                            it.getProductNameSnapshot(),
                            thumbnailUrl, // ⬅️ 썸네일 URL 전달
                            it.getUnitPrice(), it.getQty(),
                            it.getOptionSnapshotJson()
                    );
                })
                .toList();

        return new MyOrderDetailResponse(
                o.getId(), o.getOrderUid(), o.getStatus(),
                o.getTotalPrice(), o.getUsedPoint(), o.getPayAmount(),
                o.getReceiver(), o.getPhone(), o.getAddr1(), o.getAddr2(), o.getZipcode(),
                o.getRequestMemo(), o.getCreatedAt(), o.getConfirmedAt(),
                items
        );
    }

    @Operation(summary = "주문의 구매확정/피드백 가능 윈도우 조회 (교환 재배송 포함 최신 배송완료 기준)")
    @GetMapping("/{id}/window")
    public OrderWindowResponse window(@PathVariable Long id) {
        // 소유권 확인
        orderRepo.findByIdAndUserId(id, uid())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "ORDER_NOT_FOUND"));
        return windowService.getWindow(id);
    }

    @Operation(summary = "주문 수동 구매확정 (배송완료 이후 ~ 7일 이내, 교환 재배송 포함 최신 배송완료 기준)")
    @PostMapping("/{id}/confirm")
    public MyOrderDetailResponse manualConfirm(@PathVariable Long id) {
        // 소유권 및 존재 확인
        Order o = orderRepo.findByIdAndUserId(id, uid())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "ORDER_NOT_FOUND"));

        // 이미 확정?
        if (o.getConfirmedAt() != null) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "ALREADY_CONFIRMED");
        }

        // 미배송 출고가 남아있다면 확정 불가
//        long undelivered = shipmentRepo.countByOrderIdAndDeliveredAtIsNull(o.getId());
//        if (undelivered > 0) {
//            throw new ResponseStatusException(HttpStatus.CONFLICT, "HAS_UNDELIVERED_SHIPMENTS");
//        }

        // 윈도우(최신 배송완료 ~ +7일) 내인지 확인
        if (!windowService.isOpen(o.getId())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "CONFIRM_WINDOW_CLOSED");
        }

        // 상태가 배송완료가 아니라면 방어
        if (o.getStatus() != OrderStatus.DELIVERED) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "INVALID_STATUS");
        }

        // 확정 처리
        o.setStatus(OrderStatus.CONFIRMED);
        o.setConfirmedAt(LocalDateTime.now());
        o.setConfirmationType(Order.ConfirmationType.MANUAL);
        orderRepo.save(o);

        // 1. 주문에 포함된 모든 상품 ID를 한 번에 추출합니다.
        List<Long> productIds = o.getItems().stream()
                .map(OrderItem::getProductId)
                .filter(Objects::nonNull)
                .distinct()
                .toList();

        // 2. 모든 Product 정보를 한 번의 쿼리로 가져와 Map으로 만듭니다.
        Map<Long, Product> productMap = productRepo.findAllById(productIds).stream()
                .collect(Collectors.toMap(Product::getId, product -> product));

        // 3. Map에서 상품 정보를 찾아 thumbnailUrl을 포함하여 DTO를 생성합니다.
        List<MyOrderItemView> items = o.getItems().stream()
                .map(it -> {
                    Product product = productMap.get(it.getProductId());
                    String thumbnailUrl = (product != null) ? product.getThumbnailUrl() : null;

                    return new MyOrderItemView(
                            it.getId(), it.getProductId(),
                            it.getProductNameSnapshot(),
                            thumbnailUrl, // ⬅️ 썸네일 URL 전달
                            it.getUnitPrice(), it.getQty(),
                            it.getOptionSnapshotJson()
                    );
                })
                .toList();

        return new MyOrderDetailResponse(
                o.getId(), o.getOrderUid(), o.getStatus(),
                o.getTotalPrice(), o.getUsedPoint(), o.getPayAmount(),
                o.getReceiver(), o.getPhone(), o.getAddr1(), o.getAddr2(), o.getZipcode(),
                o.getRequestMemo(), o.getCreatedAt(), o.getConfirmedAt(),
                items
        );
    }

    // =========================
    // ✅ [추가] 배송 추적 API (프론트가 호출하는 경로)
    // =========================
    @Operation(summary = "주문 배송 추적(모달용) - DB 이벤트 기반")
    @GetMapping("/{id}/tracking")
    public Map<String, Object> tracking(@PathVariable Long id) {
        return buildTrackingResponse(id);
    }

    // 프론트 폴백 경로도 동일 응답으로 지원
    @Operation(summary = "주문 배송 타임라인(폴백)")
    @GetMapping("/{id}/timeline")
    public Map<String, Object> timeline(@PathVariable Long id) {
        return buildTrackingResponse(id);
    }

    // ===== 내부 유틸 =====
    private Map<String, Object> buildTrackingResponse(Long orderId) {
        Order o = orderRepo.findByIdAndUserId(orderId, uid())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "ORDER_NOT_FOUND"));

        List<Shipment> ships = shipmentRepo.findAllByOrderId(o.getId());
        if (ships == null || ships.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "NO_SHIPMENT");
        }
        Shipment s = ships.get(0);

        // 1) DB 이벤트 우선
        List<ShipmentEvent> desc = shipEventRepo.findByOrderIdAndTrackingNoOrderByOccurredAtDesc(o.getId(), s.getTrackingNo());
        List<ShipmentEvent> eventsAsc = new ArrayList<>(desc);
        Collections.reverse(eventsAsc);

        String carrierName = resolveCarrierName(eventsAsc, s.getCourierCode());
        List<Map<String, Object>> mapped;

        if (!eventsAsc.isEmpty()) {
            // DB 이벤트로 응답
            mapped = eventsAsc.stream()
                    .map(e -> Map.<String, Object>of(
                            "time", e.getOccurredAt() == null ? null : e.getOccurredAt().toString(),
                            "status", safe(e.getStatusText()),
                            "branch", safe(e.getLocation()),
                            "description", safe(e.getDescription())
                    ))
                    .toList();
        } else {
            // 2) ✅ DB에 없으면 스윗트래커 실시간 폴백
            var res = tracking.track(s.getCourierCode(), s.getTrackingNo());
            // TimelineEvent 레코드가 (level, label, time, where, kind) 구조임
            mapped = res.events().stream()
                    .map(ev -> Map.<String, Object>of(
                            "time", ev.time(),
                            "status", ev.label(),
                            "branch", ev.where(),
                            "description", extractDesc(ev)
                    ))
                    .toList();
            // 이름이 없으면 코드로 추정
            if (carrierName == null || carrierName.isBlank()) {
                carrierName = resolveCarrierName(List.of(), s.getCourierCode());
            }
        }

        Map<String, Object> out = new LinkedHashMap<>();
        out.put("carrierName", carrierName);
        out.put("invoiceNo", s.getTrackingNo());
        out.put("events", mapped);
        return out;
    }

    /** TimelineEvent 구현이 record든 Lombok이든 상관없이
     *  kind/text/message/statusText 중 있는 걸 찾아 반환 */
    private static String extractDesc(Object ev) {
        String[] cands = {"kind", "getKind", "text", "getText", "message", "getMessage", "statusText", "getStatusText"};
        for (String m : cands) {
            try {
                var md = ev.getClass().getMethod(m);
                Object v = md.invoke(ev);
                return v == null ? "" : String.valueOf(v);
            } catch (Exception ignore) {}
        }
        return "";
    }

    private static String safe(String s) { return s == null ? "" : s; }

    private static String resolveCarrierName(List<ShipmentEvent> eventsAsc, String courierCode) {
        // 이벤트에 이름이 있으면 그걸 우선 사용
        for (ShipmentEvent e : eventsAsc) {
            if (e.getCourierName() != null && !e.getCourierName().isBlank()) {
                return e.getCourierName();
            }
        }
        // 없으면 코드로 추정
        return switch (courierCode == null ? "" : courierCode) {
            case "04" -> "CJ대한통운";
            case "05" -> "롯데택배";
            case "08" -> "한진택배";
            case "06" -> "로젠택배";
            case "01" -> "우체국";
            default -> courierCode == null ? "" : courierCode;
        };
    }
}
