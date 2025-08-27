package com.meonjeo.meonjeo.product;

import jakarta.persistence.*;
import jakarta.validation.constraints.*;
import lombok.*;
import org.hibernate.annotations.Comment;

import java.time.LocalDateTime;

@Entity
@Table(
        name = "products",
        indexes = {
                @Index(name = "idx_product_seller", columnList = "seller_id")
        }
)
@Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
public class Product {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** 상품 소유 셀러의 userId */
    @Column(name = "seller_id", nullable = false)
    @Comment("상품 소유 셀러의 userId")
    private Long sellerId;

    @Size(max = 50) @NotBlank @Comment("상품명(최대 50자)")
    private String name;

    @NotBlank @Comment("브랜드명")
    private String brand;

    @Positive @Comment("기본가(원)")
    private int basePrice;

    @PositiveOrZero @Comment("할인가(원) - 0이면 미할인")
    private int salePrice;

    @NotBlank @Comment("카테고리(프론트 셀렉터 값 그대로)")
    private String category;

    @NotBlank @Comment("썸네일 이미지 URL")
    private String thumbnailUrl;

    @Lob @Basic(fetch = FetchType.LAZY) @Comment("상세 HTML")
    private String detailHtml;

    @PositiveOrZero @Comment("총 재고 수량(옵션이 있으면 variants 합계로 갱신)")
    private int stockTotal;

    @PositiveOrZero @Comment("피드백 포인트(원)")
    private int feedbackPoint;

    @Comment("판매 시작 시각(미지정 시 즉시 판매)")
    private LocalDateTime saleStartAt;

    @Comment("판매 종료 시각(미지정 시 상시 판매)")
    private LocalDateTime saleEndAt;

    @Column(name = "option1_name", length = 30) private String option1Name;
    @Column(name = "option2_name", length = 30) private String option2Name;
    @Column(name = "option3_name", length = 30) private String option3Name;
    @Column(name = "option4_name", length = 30) private String option4Name;
    @Column(name = "option5_name", length = 30) private String option5Name;
}
