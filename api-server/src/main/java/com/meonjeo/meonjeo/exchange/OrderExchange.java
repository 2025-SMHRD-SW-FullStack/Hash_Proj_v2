package com.meonjeo.meonjeo.exchange;

import com.meonjeo.meonjeo.order.OrderItem;
import com.meonjeo.meonjeo.product.Product;
import com.meonjeo.meonjeo.product.ProductVariant;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Getter @Setter
@Entity
@Table(name = "order_exchanges", indexes = {
        @Index(name="idx_exchange_user", columnList="user_id"),
        @Index(name="idx_exchange_seller", columnList="seller_id"),
        @Index(name="idx_exchange_item", columnList="order_item_id"),
        @Index(name="idx_exchange_status", columnList="status")
})
public class OrderExchange {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // 소유/권한 체킹용
    @Column(name="user_id", nullable=false)
    private Long userId;

    @Column(name="seller_id", nullable=false)
    private Long sellerId;

    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name="order_item_id", nullable=false)
    private OrderItem orderItem;

    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name="product_id", nullable=false)
    private Product product;

    // 원래 구매한 SKU
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name="original_variant_id", nullable=false)
    private ProductVariant originalVariant;

    // 사용자가 요청한 교환 희망 SKU(선택, 없으면 동일 SKU)
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name="requested_variant_id")
    private ProductVariant requestedVariant;

    // 사장이 최종 승인한 SKU
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name="approved_variant_id")
    private ProductVariant approvedVariant;

    @Enumerated(EnumType.STRING)
    @Column(nullable=false, length=32)
    private ExchangeStatus status = ExchangeStatus.REQUESTED;

    // 수량 (기본 1)
    @Column(nullable=false)
    private int qty = 1;

    // 사유 및 메모
    @Column(length=1000)
    private String reasonText;

    // 반려 사유
    @Column(length=500)
    private String rejectReason;

    // 교환 요청 가능 마감 (배송완료 + 7일)
    @Column(nullable=false)
    private LocalDateTime windowEndsAt;

    // 교환 발송용 Shipment ID (있다면 링크)
    @Column
    private Long replacementShipmentId;

    @OneToMany(mappedBy = "exchange", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<OrderExchangePhoto> photos = new ArrayList<>();

    @CreationTimestamp
    private LocalDateTime createdAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;
}
