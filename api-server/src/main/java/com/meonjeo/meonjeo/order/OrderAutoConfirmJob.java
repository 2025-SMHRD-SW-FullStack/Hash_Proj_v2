package com.meonjeo.meonjeo.order;

import com.meonjeo.meonjeo.common.OrderStatus;
import com.meonjeo.meonjeo.common.ShipmentStatus;
import com.meonjeo.meonjeo.shipment.Shipment;
import com.meonjeo.meonjeo.shipment.ShipmentRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Slf4j
@Component
@RequiredArgsConstructor
public class OrderAutoConfirmJob {

    private final ShipmentRepository shipmentRepo;
    private final OrderRepository orderRepo;

    /**
     * 매일 03:10에 실행: 배송완료 + 7일 지난 주문 자동 구매확정
     * (서버 시간대 기준. @EnableScheduling 필요)
     */
    @Transactional
    @Scheduled(cron = "0 10 3 * * *")
    public void confirmAfterSevenDays() {
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime threshold = now.minusDays(7);

        List<Shipment> targets = shipmentRepo.findAllByStatusAndDeliveredAtBefore(
                ShipmentStatus.DELIVERED, threshold);

        int ok = 0, skip = 0, fail = 0;

        for (Shipment sh : targets) {
            try {
                Long orderId = sh.getOrderId();
                if (orderId == null) { skip++; continue; }

                var opt = orderRepo.findById(orderId);
                if (opt.isEmpty()) { skip++; continue; }

                Order o = opt.get();

                // 이미 확정이면 스킵(멱등)
                if (o.getStatus() == OrderStatus.CONFIRMED && o.getConfirmedAt() != null) {
                    skip++; continue;
                }
                // 결제 완료 상태만 확정
                if (o.getStatus() != OrderStatus.PAID) {
                    skip++; continue;
                }

                o.setStatus(OrderStatus.CONFIRMED);
                o.setConfirmedAt(now);
                orderRepo.save(o);
                ok++;
            } catch (Exception e) {
                fail++;
                log.warn("Auto-confirm failed: shipmentId={}, orderId={}, reason={}",
                        sh.getId(), sh.getOrderId(), e.toString());
            }
        }

        if (ok + skip + fail > 0) {
            log.info("[AutoConfirm D+7] threshold={}, ok={}, skip={}, fail={}",
                    threshold, ok, skip, fail);
        }
    }
}
