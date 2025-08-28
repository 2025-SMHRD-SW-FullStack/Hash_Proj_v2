package com.meonjeo.meonjeo.order;

import com.meonjeo.meonjeo.common.OrderStatus;
import com.meonjeo.meonjeo.shipment.ShipmentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Component
@RequiredArgsConstructor
public class OrderAutoConfirmScheduler {

    private final OrderRepository orderRepo;
    private final ShipmentRepository shipmentRepo;

    /** 매일 03:00 KST 실행 */
    @Scheduled(cron = "0 0 3 * * *", zone = "Asia/Seoul")
    @Transactional
    public void autoConfirmDeliveredOver7Days() {
        var candidates = orderRepo.findDeliveredUnconfirmed(OrderStatus.DELIVERED);
        LocalDateTime now = LocalDateTime.now();

        for (Order o : candidates) {
            if (o.getConfirmedAt() != null) continue; // 멱등

            // 주문의 최신 배송완료 시각(교환 재배송 포함)
            LocalDateTime effectiveDeliveredAt = shipmentRepo.maxDeliveredAtByOrderId(o.getId());
            if (effectiveDeliveredAt == null) {
                // 배송완료 상태지만 deliveredAt이 없는 엣지 케이스 방어
                continue;
            }

            // now >= (최신 배송완료 + 7일) 이면 자동 확정
            if (!now.isBefore(effectiveDeliveredAt.plusDays(7))) {
                o.setStatus(OrderStatus.CONFIRMED);
                o.setConfirmedAt(now);
                o.setConfirmationType(Order.ConfirmationType.AUTO);
                // (포인트 지급은 피드백 시점에만 — 자동확정이라 피드백 불가)
                orderRepo.save(o);
            }
        }
    }
}
