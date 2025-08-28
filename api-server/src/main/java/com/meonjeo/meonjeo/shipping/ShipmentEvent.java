package com.meonjeo.meonjeo.shipping;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.Comment;

import java.time.LocalDateTime;

@Entity
@Table(
        name = "shipment_events",
        indexes = {
                @Index(name = "idx_ship_order", columnList = "order_id"),
                @Index(name = "idx_ship_tracking", columnList = "tracking_no")
        }
)
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ShipmentEvent {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "order_id", nullable = false)
    @Comment("주문 ID")
    private Long orderId;

    @Column(name = "courier_code", length = 64)
    @Comment("택배사 코드(예: kr.cjlogistics)")
    private String courierCode;

    @Column(name = "courier_name", length = 64)
    @Comment("택배사 이름(예: CJ대한통운)")
    private String courierName;

    @Column(name = "tracking_no", length = 64)
    @Comment("운송장 번호")
    private String trackingNo;

    @Column(name = "status_code", length = 32)
    @Comment("상태 코드(원문)")
    private String statusCode;

    @Column(name = "status_text", length = 64)
    @Comment("상태 텍스트(원문)")
    private String statusText;

    @Column(length = 128)
    @Comment("발생 위치(지점)")
    private String location;

    @Lob
    @Comment("설명/메시지(원문)")
    private String description;

    @Comment("발생 시각")
    private LocalDateTime occurredAt;
}
