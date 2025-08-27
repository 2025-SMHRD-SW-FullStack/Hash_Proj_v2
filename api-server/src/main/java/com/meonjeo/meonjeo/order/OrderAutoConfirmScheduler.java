package com.meonjeo.meonjeo.order;

import com.meonjeo.meonjeo.common.OrderStatus;
import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Component
@RequiredArgsConstructor
public class OrderAutoConfirmScheduler {

    private final OrderRepository orderRepo;

    @Scheduled(cron = "0 0 3 * * *", zone = "Asia/Seoul")
    @Transactional
    public void autoConfirmDeliveredOver7Days() {
        LocalDateTime threshold = LocalDateTime.now().minusDays(7);
        var targets = orderRepo.findAutoConfirmTargets(OrderStatus.DELIVERED, threshold);

        for (Order o : targets) {
            if (o.getConfirmedAt() != null) continue; // 멱등
            o.setStatus(OrderStatus.CONFIRMED);
            o.setConfirmedAt(LocalDateTime.now());
            o.setConfirmationType(Order.ConfirmationType.AUTO);
            // (포인트 지급은 피드백 시점에만 — 자동확정이라 피드백 불가)
            orderRepo.save(o);
        }
    }
}
