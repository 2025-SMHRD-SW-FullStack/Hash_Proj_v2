package com.meonjeo.meonjeo.shipment;

import com.meonjeo.meonjeo.common.OrderStatus;
import com.meonjeo.meonjeo.common.ShipmentStatus;
import com.meonjeo.meonjeo.order.Order;
import com.meonjeo.meonjeo.order.OrderRepository;
import com.meonjeo.meonjeo.shipment.dto.TimelineEvent;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class ShipmentSyncService {

    private final TrackingService trackingService;
    private final ShipmentRepository shipmentRepo;
    private final OrderRepository orderRepo;

    @Transactional
    public void syncOne(Long shipmentId) {
        Shipment s = shipmentRepo.findById(shipmentId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "SHIPMENT_NOT_FOUND"));

        if (s.getCourierCode() == null || s.getTrackingNo() == null) return;

        var tr = trackingService.track(s.getCourierCode(), s.getTrackingNo());
        int level = tr.events().stream().mapToInt(TimelineEvent::level).max().orElse(1);
        ShipmentStatus newStatus = mapLevelToStatus(level);

        // 최초 배송완료 시 deliveredAt 고정
        if (newStatus == ShipmentStatus.DELIVERED && s.getDeliveredAt() == null) {
            s.setDeliveredAt(LocalDateTime.now());
        }
        s.setStatus(newStatus);
        s.setLastSyncedAt(LocalDateTime.now());
        shipmentRepo.save(s);

        // 주문 레벨로 승격: 모든 출고가 완료되면 Order.deliveredAt 설정 + 상태 DELIVERED
        if (newStatus == ShipmentStatus.DELIVERED) {
            Long orderId = s.getOrderId();
            if (shipmentRepo.countByOrderIdAndDeliveredAtIsNull(orderId) == 0) {
                LocalDateTime maxDelivered = shipmentRepo.maxDeliveredAtByOrderId(orderId);
                Order o = orderRepo.findById(orderId).orElse(null);
                if (o != null) {
                    o.setDeliveredAt(maxDelivered);
                    if (o.getStatus() != OrderStatus.CONFIRMED) { // 이미 확정된 건은 건드리지 않음
                        o.setStatus(OrderStatus.DELIVERED);
                    }
                    orderRepo.save(o);
                }
            }
        }
    }

    private ShipmentStatus mapLevelToStatus(int lv) {
        if (lv >= 6) return ShipmentStatus.DELIVERED;
        if (lv >= 2) return ShipmentStatus.IN_TRANSIT;
        return ShipmentStatus.READY;
    }
}
