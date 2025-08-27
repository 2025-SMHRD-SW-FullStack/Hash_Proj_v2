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

    /** (선택) 이 출고 건의 셀러 userId — 멀티셀러 분리 출고용 */
    @Column(name = "seller_id")
    private Long sellerId;

    private String courierCode; // 스윗트래커 코드
    private String trackingNo;

    @Enumerated(EnumType.STRING)
    private ShipmentStatus status;


    @Enumerated(EnumType.STRING)
    @Column(name = "type", nullable = false, length = 16)
    @Builder.Default
    private ShipmentType type = ShipmentType.ORDER;

    // 교환 연계용(선택): 교환ID를 직접 달거나, ManyToOne으로 매핑해도 됨
    @Column(name = "exchange_id")
    private Long exchangeId;

    private LocalDateTime deliveredAt;
    private LocalDateTime lastSyncedAt;
}
