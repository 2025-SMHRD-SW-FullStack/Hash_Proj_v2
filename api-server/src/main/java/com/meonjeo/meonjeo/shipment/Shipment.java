package com.meonjeo.meonjeo.shipment;

import com.meonjeo.meonjeo.common.ShipmentStatus;
import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity @Table(name="shipments")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Shipment {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long orderId;
    private String courierCode; // 스윗트래커 코드
    private String trackingNo;

    @Enumerated(EnumType.STRING)
    private ShipmentStatus status;

    private LocalDateTime deliveredAt;
    private LocalDateTime lastSyncedAt;
}
