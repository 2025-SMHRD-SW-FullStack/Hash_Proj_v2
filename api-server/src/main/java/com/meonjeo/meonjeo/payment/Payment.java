package com.meonjeo.meonjeo.payment;

import jakarta.persistence.*;
import lombok.*;
import java.time.OffsetDateTime;

@Entity
@Table(
        name="payments",
        uniqueConstraints = @UniqueConstraint(name="uk_payment_key", columnNames = {"payment_key"}),
        indexes = {
                @Index(name="idx_payment_order", columnList="order_id"),
                @Index(name="idx_payment_booking", columnList="ad_booking_id")
        }
)
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Payment {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name="order_id")
    private Long orderId;

    @Column(name="ad_booking_id")
    private Long adBookingId;

    private String provider;              // "TOSS"

    @Column(name="payment_key", length = 150, nullable = false)
    private String paymentKey;            // toss paymentKey (유니크)

    private String method;                // CARD, EASY_PAY 등
    private int amount;                   // 승인 금액
    private OffsetDateTime approvedAt;

    @Lob private String rawResponseJson;  // 원본 저장
}
