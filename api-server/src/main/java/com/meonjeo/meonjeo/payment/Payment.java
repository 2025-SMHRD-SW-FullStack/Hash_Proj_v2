package com.meonjeo.meonjeo.payment;

import jakarta.persistence.*;
import lombok.*;
import java.time.OffsetDateTime;

@Entity @Table(name="payments")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Payment {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long orderId;
    private Long adBookingId;

    private String provider;    // "TOSS"
    private String paymentKey;  // toss paymentKey
    private String method;      // CARD, EASY_PAY 등
    private int amount;         // 승인 금액
    private OffsetDateTime approvedAt;

    @Lob private String rawResponseJson; // 원본 저장
}
