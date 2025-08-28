package com.meonjeo.meonjeo.shipping;

import com.meonjeo.meonjeo.order.DeliveryAutoConfirmService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class ShippingEventIngestService {
    private final ShipmentEventRepository eventRepo;
    private final DeliveryAutoConfirmService autoConfirm;

    @Transactional
    public Long ingest(IngestEventRequest r) {
        ShipmentEvent e = ShipmentEvent.builder()
                .orderId(r.orderId())
                .courierCode(r.courierCode())
                .courierName(r.courierName())
                .trackingNo(r.trackingNo())
                .statusCode(r.statusCode())
                .statusText(r.statusText())
                .location(r.location())
                .description(r.description())
                .occurredAt(r.occurredAt() != null ? r.occurredAt() : LocalDateTime.now())
                .build();
        eventRepo.save(e);

        // 저장 직후 두 메서드 호출 (결정판)
        autoConfirm.updateInTransitIfMoved(r.orderId());
        autoConfirm.updateDeliveredIfComplete(r.orderId());

        return e.getId();
    }

    public record IngestEventRequest(
            Long orderId,
            String courierCode, String courierName,
            String trackingNo, String statusCode, String statusText,
            String location, String description,
            LocalDateTime occurredAt
    ) {}
}
