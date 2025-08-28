package com.meonjeo.meonjeo.order;

import com.meonjeo.meonjeo.common.OrderStatus;
import com.meonjeo.meonjeo.shipping.OrderShipment;
import com.meonjeo.meonjeo.shipping.OrderShipmentRepository;
import com.meonjeo.meonjeo.shipping.ShipmentEvent;
import com.meonjeo.meonjeo.shipping.ShipmentEventRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;
import java.util.Locale;

@Service
@RequiredArgsConstructor
public class DeliveryAutoConfirmService {

    private final OrderRepository orderRepo;
    private final OrderShipmentRepository shipmentRepo;
    private final ShipmentEventRepository eventRepo;

    /** ✅ 어떤 송장이라도 '이동 시작' 이벤트가 발생하면 주문 상태를 IN_TRANSIT로 올린다(멱등). */
    @Transactional
    public void updateInTransitIfMoved(Long orderId) {
        Order order = orderRepo.findById(orderId).orElse(null);
        if (order == null) return;

        // 이미 최종 상태면 손대지 않음
        if (order.getStatus() == OrderStatus.DELIVERED || order.getStatus() == OrderStatus.CONFIRMED) return;
        if (order.getStatus() == OrderStatus.IN_TRANSIT) return; // 이미 배송중

        // 송장 없으면 판단 불가
        List<OrderShipment> shipments = shipmentRepo.findByOrderId(orderId);
        if (shipments.isEmpty()) return;

        // 주문 전체 이벤트 최신→과거 순으로 한 번에 가져온 뒤, 트래킹별 최신 이벤트만 추려서 검사
        List<ShipmentEvent> all = eventRepo.findByOrderIdOrderByOccurredAtDesc(orderId);
        Map<String, ShipmentEvent> latestByTracking = new HashMap<>();
        for (ShipmentEvent ev : all) {
            String tno = nz(ev.getTrackingNo());
            if (!latestByTracking.containsKey(tno)) {
                latestByTracking.put(tno, ev);
            }
        }

        boolean anyMovement = false;
        for (OrderShipment s : shipments) {
            String tno = nz(s.getTrackingNo());
            if (tno.isBlank()) continue;
            ShipmentEvent latest = latestByTracking.get(tno);
            if (latest != null && isMovementEvent(latest)) {
                anyMovement = true;
                break;
            }
        }

        if (anyMovement) {
            // PAID/READY 등 초기 상태에서만 올려줌 (하위 상태로의 강등 없음)
            order.setStatus(OrderStatus.IN_TRANSIT);
        }
    }

    /** ✅ 모든 송장의 최신 이벤트가 '배송완료'이면 deliveredAt(최초1회) 세팅 + 상태 DELIVERED. */
    @Transactional
    public void updateDeliveredIfComplete(Long orderId) {
        Order order = orderRepo.findById(orderId).orElse(null);
        if (order == null) return;

        boolean alreadyConfirmed = order.getStatus() == OrderStatus.CONFIRMED;

        List<OrderShipment> shipments = shipmentRepo.findByOrderId(orderId);
        if (shipments.isEmpty()) return;

        boolean allDelivered = true;
        LocalDateTime latestDeliveredAt = null;

        for (OrderShipment s : shipments) {
            String tno = s.getTrackingNo();
            if (tno == null || tno.isBlank()) { allDelivered = false; break; }

            List<ShipmentEvent> evs = eventRepo.findByOrderIdAndTrackingNoOrderByOccurredAtDesc(orderId, tno);
            ShipmentEvent latest = evs.isEmpty() ? null : evs.get(0);
            if (latest == null || !isDeliveredEvent(latest)) { allDelivered = false; break; }

            if (latest.getOccurredAt() != null &&
                    (latestDeliveredAt == null || latest.getOccurredAt().isAfter(latestDeliveredAt))) {
                latestDeliveredAt = latest.getOccurredAt();
            }
        }

        if (!allDelivered) return;

        if (order.getDeliveredAt() == null) {
            order.setDeliveredAt(latestDeliveredAt != null ? latestDeliveredAt : LocalDateTime.now());
        }
        if (!alreadyConfirmed) {
            order.setStatus(OrderStatus.DELIVERED);
        }
    }

    // ===== 이벤트 판별 유틸 =====

    /** 이동 시작/진행 이벤트 (집화완료, 배송중, 지점 도착, 배송출발 등) */
    private boolean isMovementEvent(ShipmentEvent ev) {
        String code = nz(ev.getStatusCode()).toUpperCase(Locale.ROOT);
        String text = nz(ev.getStatusText()).toLowerCase(Locale.ROOT);

        // 코드 기준: 2~5 또는 영문 표기
        if (code.equals("2") || code.equals("3") || code.equals("4") || code.equals("5")) return true;
        if (code.equals("IN_TRANSIT") || code.equals("OUT_FOR_DELIVERY")) return true;

        // 텍스트 기준(원문 그대로 저장된다고 가정)
        return text.contains("집화")        // 집화완료
                || text.contains("배송중")
                || text.contains("지점 도착")
                || text.contains("터미널 도착")
                || text.contains("배송출발")
                || text.contains("배달출발")
                || text.contains("in transit")
                || text.contains("arrived at")
                || text.contains("departed")
                || text.contains("out for delivery");
    }

    /** 완료 이벤트 (배송 완료) */
    private boolean isDeliveredEvent(ShipmentEvent ev) {
        String code = nz(ev.getStatusCode()).toUpperCase(Locale.ROOT);
        String text = nz(ev.getStatusText()).toLowerCase(Locale.ROOT);

        if (code.equals("6") || code.equals("DELIVERED")) return true;
        return text.contains("배송완료") || text.contains("delivered") || text.contains("delivery complete");
    }

    private String nz(String s) { return s == null ? "" : s; }
}
