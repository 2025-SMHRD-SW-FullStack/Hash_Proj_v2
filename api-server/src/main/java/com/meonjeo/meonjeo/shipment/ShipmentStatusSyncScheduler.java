package com.meonjeo.meonjeo.shipment;

import com.meonjeo.meonjeo.common.ShipmentStatus;
import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
@RequiredArgsConstructor
public class ShipmentStatusSyncScheduler {

    private final ShipmentRepository shipmentRepo;
    private final ShipmentSyncService syncService;

    // 30분마다 미완료 출고건 동기화
    @Scheduled(cron = "0 */30 * * * *", zone = "Asia/Seoul")
    @Transactional
    public void pollAndSync() {
        var targets = shipmentRepo.findAllByCourierCodeIsNotNullAndTrackingNoIsNotNullAndStatusNot(ShipmentStatus.DELIVERED);
        for (Shipment s : targets) {
            syncService.syncOne(s.getId());
        }
    }
}
