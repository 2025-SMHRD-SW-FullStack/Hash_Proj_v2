package com.meonjeo.meonjeo.shipment;

import com.meonjeo.meonjeo.common.ShipmentStatus;
import com.meonjeo.meonjeo.shipment.dto.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class ShipmentService {
    private final ShipmentRepository repo;
    private final SweetTrackerPort sweetTracker; // 스윗트래커 연동 포트

    @Transactional
    public void dispatch(DispatchRequest req) {
        var s = repo.findByOrderId(req.orderId()).orElse(
                Shipment.builder().orderId(req.orderId()).build()
        );
        s.setCourierCode(req.courierCode());
        s.setTrackingNo(req.trackingNo());
        s.setStatus(ShipmentStatus.READY);
        s.setLastSyncedAt(LocalDateTime.now());
        repo.save(s);
    }

    // ⬇️ readOnly 제거 (상태 업데이트/저장 포함)
    @Transactional
    public TrackingResponse tracking(Long orderId) {
        Shipment s = repo.findByOrderId(orderId).orElseThrow();

        TrackingResponse tr = sweetTracker.fetch(s.getCourierCode(), s.getTrackingNo()); // 1~6 단계

        // ⬇️ record가 아니므로 getCurrentLevel() 사용
        updateStatusFromLevel(s, tr.getCurrentLevel());
        return tr;
    }

    // 내부 호출이므로 @Transactional 없어도 됨(위 tracking이 트랜잭션 범위 보장)
    protected void updateStatusFromLevel(Shipment s, int level) {
        switch (level) {
            case 1 -> s.setStatus(ShipmentStatus.READY);
            case 2, 3, 4, 5 -> s.setStatus(ShipmentStatus.IN_TRANSIT);
            case 6 -> {
                s.setStatus(ShipmentStatus.DELIVERED);
                if (s.getDeliveredAt() == null) {
                    s.setDeliveredAt(LocalDateTime.now());
                }
            }
        }
        s.setLastSyncedAt(LocalDateTime.now());
        repo.save(s);
    }
}
