package com.meonjeo.meonjeo.order;

import jakarta.persistence.*;
import lombok.*;

/**
 * 주문 품목 스냅샷
 * - productNameSnapshot, unitPrice, optionSnapshotJson은 주문 시점의 값을 고정 저장.
 * - optionSnapshotJson: 프론트가 보낸 optionJson을 정규화해 저장(예: {"색깔":"레드","사이즈":"XL"}).
 */
@Entity @Table(name="order_items")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class OrderItem {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional=false) @JoinColumn(name="order_id")
    private Order order;

    private Long productId;

    /** 주문 시점의 상품명 스냅샷 (이후 상품명이 바뀌어도 주문에는 영향 없음) */
    private String productNameSnapshot;

    /** 주문 시점의 단가(원). (기본/할인가 + 옵션가 합산) */
    private int unitPrice;

    /** 수량 */
    private int qty;

    /** 선택 옵션 스냅샷(JSON). 예: {"색깔":"레드","사이즈":"XL"} */
    @Lob private String optionSnapshotJson;
}
