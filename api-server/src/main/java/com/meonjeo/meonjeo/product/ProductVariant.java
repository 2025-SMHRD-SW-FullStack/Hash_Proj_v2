package com.meonjeo.meonjeo.product;

import jakarta.persistence.*;
import jakarta.validation.constraints.PositiveOrZero;
import lombok.*;
import org.hibernate.annotations.Comment;

import java.time.LocalDateTime;

/**
 * 옵션 조합(최대 5단) 단위의 SKU
 * - addPrice: 해당 조합에서 기본/할인가에 더해지는 금액(+원). 0 가능.
 * - stock   : 해당 조합의 재고
 * - optionXValue는 라벨이 없으면(null) 보내지 않아도 됨
 */
@Entity
@Table(
        name = "product_variants",
        uniqueConstraints = @UniqueConstraint(
                name = "uk_variant_unique_combo",
                columnNames = {"product_id","option1_value","option2_value","option3_value","option4_value","option5_value"}
        ),
        indexes = @Index(name = "idx_variant_product", columnList = "product_id")
)
@Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
public class ProductVariant {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "product_id")
    private Product product;

    // ===== 사장님이 입력하는 옵션 값(없으면 null) =====
    @Column(name = "option1_value", length = 50) private String option1Value;
    @Column(name = "option2_value", length = 50) private String option2Value;
    @Column(name = "option3_value", length = 50) private String option3Value;
    @Column(name = "option4_value", length = 50) private String option4Value;
    @Column(name = "option5_value", length = 50) private String option5Value;

    @Comment("해당 조합 추가금(±원). 음수 가능")
    private int addPrice;

    @PositiveOrZero
    @Comment("해당 조합 재고")
    private int stock;

    @Column(name = "sku_code", length = 64)
    @Comment("선택: 외부 표기용 SKU 코드")
    private String skuCode;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    @PrePersist void onCreate(){ createdAt = updatedAt = java.time.LocalDateTime.now(); }
    @PreUpdate  void onUpdate(){ updatedAt = java.time.LocalDateTime.now(); }
}
