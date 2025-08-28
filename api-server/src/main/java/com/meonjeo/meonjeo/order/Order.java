// src/main/java/com/meonjeo/meonjeo/order/Order.java
package com.meonjeo.meonjeo.order;

import com.meonjeo.meonjeo.common.OrderStatus;
import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import java.util.*;

@Entity @Table(name="orders")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Order {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String orderUid;
    private Long userId;

    @Enumerated(EnumType.STRING)
    private OrderStatus status;

    /** 상품 총액(옵션/수량 반영, 배송비 제외) */
    private int totalPrice;

    /** 배송비(고정 3,000원) */
    @Column(name = "shipping_fee")
    private int shippingFee;

    /** 사용 포인트(원) */
    private int usedPoint;

    /** 실제 결제 금액(원) */
    private int payAmount;

    // ===== 수취 정보 =====
    private String receiver;
    private String phone;
    private String addr1; private String addr2; private String zipcode;

    @Column(name = "request_memo", length = 200)
    private String requestMemo;

    private LocalDateTime createdAt;

    /** 모든 배송이 완료된 시각(최초 1회 확정) */
    @Column(name = "delivered_at")
    private LocalDateTime deliveredAt;

    /** 구매 확정 시각 */
    private LocalDateTime confirmedAt;

    /** 구매확정 방식: MANUAL(사용자) / AUTO(배치) */
    @Enumerated(EnumType.STRING)
    @Column(name = "confirmation_type", length = 16)
    private ConfirmationType confirmationType;

    @OneToMany(mappedBy="order", cascade=CascadeType.ALL, orphanRemoval=true)
    @Builder.Default
    private List<OrderItem> items = new ArrayList<>();

    public enum ConfirmationType { MANUAL, AUTO }
}
