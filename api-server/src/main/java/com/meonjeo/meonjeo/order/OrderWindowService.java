package com.meonjeo.meonjeo.order;

import com.meonjeo.meonjeo.order.dto.OrderWindowResponse;
import com.meonjeo.meonjeo.shipment.ShipmentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class OrderWindowService {

    private final OrderRepository orderRepo;        // ★ 추가
    private final ShipmentRepository shipmentRepo;  // (레거시 fallback)

    /** 최신 배송완료 시각(교환 재배송 포함) */
    public Optional<LocalDateTime> effectiveDeliveredAt(Long orderId) {
        // 1) 주문 테이블 delivered_at 우선
        LocalDateTime fromOrder = orderRepo.findById(orderId)
                .map(Order::getDeliveredAt)
                .orElse(null);
        if (fromOrder != null) return Optional.of(fromOrder);

        // 2) (레거시) shipments.delivered_at의 max를 fallback으로
        return Optional.ofNullable(shipmentRepo.maxDeliveredAtByOrderId(orderId));
    }

    /** 마감 시각 = 최신 배송완료 + 7일 */
    public Optional<LocalDateTime> deadlineAt(Long orderId) {
        return effectiveDeliveredAt(orderId).map(t -> t.plusDays(7));
    }

    /** 현재가 윈도우 내인지 */
    public boolean isOpen(Long orderId) {
        LocalDateTime now = LocalDateTime.now();
        return effectiveDeliveredAt(orderId)
                .map(eff -> {
                    LocalDateTime end = eff.plusDays(7);
                    return !now.isBefore(eff) && now.isBefore(end);
                })
                .orElse(false);
    }

    /** 프론트 노출용 DTO */
    public OrderWindowResponse getWindow(Long orderId) {
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime eff = effectiveDeliveredAt(orderId).orElse(null);
        LocalDateTime deadline = (eff == null) ? null : eff.plusDays(7);

        boolean open = false;
        Long remainingSeconds = null;
        if (eff != null && deadline != null) {
            open = !now.isBefore(eff) && now.isBefore(deadline);
            remainingSeconds = Math.max(0L, Duration.between(now, deadline).getSeconds());
        }
        return new OrderWindowResponse(eff, deadline, now, open, remainingSeconds);
    }
}
