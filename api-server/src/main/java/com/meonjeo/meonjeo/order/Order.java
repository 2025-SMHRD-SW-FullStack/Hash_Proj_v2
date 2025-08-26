package com.meonjeo.meonjeo.order;

import com.meonjeo.meonjeo.common.OrderStatus;
import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import java.util.*;

/**
 * 주문 마스터
 * - 금액/상품명/옵션 등은 하위 OrderItem의 스냅샷을 기준으로 계산됨.
 * - orderUid는 결제사(Toss)에 전달할 고유 문자열. 예: ORD-YYYYMMDD-랜덤
 */
@Entity @Table(name="orders")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Order {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** 결제사에 전달하는 주문 식별자(고유) */
    private String orderUid;

    /** 주문자(User) 식별자 */
    private Long userId;

    /** 주문 상태(예: CREATED, PAID, CONFIRMED, CANCELED 등) */
    @Enumerated(EnumType.STRING) private OrderStatus status;

    /** 상품 총액(옵션/수량 반영) */
    private int totalPrice;

    /** 사용 포인트(원) */
    private int usedPoint;

    /** 실제 결제 금액(원) */
    private int payAmount;

    // ===== 수취 정보 =====
    private String receiver;
    private String phone;
    private String addr1; private String addr2; private String zipcode;
    private String requestMemo;

    private LocalDateTime createdAt;
    /** 구매 확정 시각(예: D+7 자동 확정 등) */
    private LocalDateTime confirmedAt;

    @OneToMany(mappedBy="order", cascade=CascadeType.ALL, orphanRemoval=true)
    @Builder.Default
    private List<OrderItem> items = new ArrayList<>();
}
