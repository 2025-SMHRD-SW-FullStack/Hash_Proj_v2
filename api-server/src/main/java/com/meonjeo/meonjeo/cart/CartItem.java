package com.meonjeo.meonjeo.cart;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(
        name = "cart_items",
        uniqueConstraints = @UniqueConstraint(
                name = "uk_cart_user_variant",
                columnNames = {"user_id","variant_id"}
        ),
        indexes = {
                @Index(name = "idx_cart_user", columnList = "user_id"),
                @Index(name = "idx_cart_variant", columnList = "variant_id")
        }
)
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class CartItem {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name="user_id", nullable=false)
    private Long userId;

    @Column(name="product_id", nullable=false)
    private Long productId;

    @Column(name="seller_id", nullable=false)
    private Long sellerId;

    @Column(name="variant_id", nullable=false)
    private Long variantId;

    /** 선택 옵션 표시용 JSON 스냅샷(라벨→값). 결제 직전에는 항상 재검증/재계산 */
    @Lob
    @Column(name="selected_options_json")
    private String selectedOptionsJson;

    @Column(nullable=false)
    private int qty;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    @PrePersist void onCreate(){ createdAt = updatedAt = LocalDateTime.now(); }
    @PreUpdate  void onUpdate(){ updatedAt = LocalDateTime.now(); }
}
