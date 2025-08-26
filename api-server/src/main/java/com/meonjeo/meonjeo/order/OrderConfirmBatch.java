package com.meonjeo.meonjeo.order;

import com.meonjeo.meonjeo.common.OrderStatus;
import com.meonjeo.meonjeo.shipment.Shipment;
import com.meonjeo.meonjeo.shipment.ShipmentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@EnableScheduling
@Component
@RequiredArgsConstructor
public class OrderConfirmBatch {
    private final ShipmentRepository shipmentRepo;
    private final OrderRepository orderRepo;

    // 매일 00:15 (Asia/Seoul JVM이면 현지시간 기준)
    @Scheduled(cron = "0 15 0 * * *")
    @Transactional
    public void autoconfirm() {
        LocalDateTime border = LocalDateTime.now().minusDays(7);
        // 배송완료 && D+7 지난 주문들 확정
        List<Shipment> delivered = shipmentRepo.findAll().stream()
                .filter(s -> s.getDeliveredAt() != null && s.getDeliveredAt().isBefore(border))
                .toList();

        for (Shipment s : delivered) {
            Order o = orderRepo.findById(s.getOrderId()).orElse(null);
            if (o != null && o.getStatus() != OrderStatus.CONFIRMED) {
                o.setStatus(OrderStatus.CONFIRMED);
                o.setConfirmedAt(LocalDateTime.now());
                orderRepo.save(o);
            }
        }
    }
}
