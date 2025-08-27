package com.meonjeo.meonjeo.order;

import jakarta.persistence.*;
import lombok.*;

@Entity @Table(name="order_items")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class OrderItem {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional=false) @JoinColumn(name="order_id")
    private Order order;

    private Long productId;

    /** 주문 시점의 상품 소유 셀러(userId) 스냅샷 */
    @Column(name = "seller_id", nullable = false)
    private Long sellerId;

    /** 주문 시점의 상품명 스냅샷 */
    private String productNameSnapshot;

    /** 주문 시점의 단가(원). (기본/할인가 + 옵션가 합산) */
    private int unitPrice;

    /** 수량 */
    private int qty;

    /** 주문 시점의 피드백 포인트 스냅샷 */
    @Column(name = "feedback_point_snapshot")
    private int feedbackPointSnapshot;

    /** 선택 옵션 스냅샷(JSON). 예: {"색깔":"레드","사이즈":"XL"} */
    @Lob private String optionSnapshotJson;
}
