package com.meonjeo.meonjeo.product.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.*;

import java.time.LocalDateTime;
import java.util.List;

/**
 * [프론트 참고]
 * 1) 옵션이 없는 상품:
 *    - option1Name~option5Name 전부 생략 또는 null/빈문자열
 *    - variants 생략 또는 빈 배열 -> 서버가 단일 SKU(+0, stock=stockTotal) 자동 생성
 * 2) 옵션이 있는 상품:
 *    - option1Name~optionNName(최대 5) 라벨 설정
 *    - variants에 각 조합을 나열 (각 조합의 addPrice/stock 포함)
 * 3) 유효성
 *    - saleStartAt ≤ saleEndAt (둘 다 있을 때)
 *    - 라벨이 없는 단계의 값은 무시됨
 * 4) 최종 표시가격 = (salePrice>0 ? salePrice : basePrice) + addPrice
 */
@Schema(
        name = "ProductCreateRequest",
        description = "상품 등록 요청",
        example = """
  {
    "name": "먼저써봄 무선 블루투스 이어폰 S9",
    "brand": "MEONJEO",
    "basePrice": 129000,
    "salePrice": 99000,
    "category": "ELECTRONICS/HEADSET",
    "thumbnailUrl": "https://cdn.example.com/products/air-s9/thumb.webp",
    "detailHtml": "<h2>상품 소개</h2><p>ANC, 24h</p>",
    "stockTotal": 100,
    "feedbackPoint": 500,
    "saleStartAt": "2025-09-01T10:00:00",
    "saleEndAt": "2025-09-30T23:59:59",
    "option1Name": "색깔",
    "option2Name": "사이즈",
    "variants": [
      { "option1Value": "레드", "option2Value": "M",  "addPrice": 0,    "stock": 30 },
      { "option1Value": "레드", "option2Value": "XL", "addPrice": 5000, "stock": 20 },
      { "option1Value": "블랙", "option2Value": "M",  "addPrice": 0,    "stock": 30 },
      { "option1Value": "블랙", "option2Value": "XL", "addPrice": 5000, "stock": 20 }
    ]
  }
  """
)
public record ProductCreateRequest(
        @Schema(description = "상품명", example = "먼저써봄 무선 블루투스 이어폰 S9", requiredMode = Schema.RequiredMode.REQUIRED)
        @NotBlank String name,

        @Schema(description = "브랜드명", example = "MEONJEO", requiredMode = Schema.RequiredMode.REQUIRED)
        @NotBlank String brand,

        @Schema(description = "기본가(원)", example = "129000", minimum = "1", requiredMode = Schema.RequiredMode.REQUIRED)
        @Positive int basePrice,

        @Schema(description = "할인가(원), 0이면 미할인", example = "99000", minimum = "0", requiredMode = Schema.RequiredMode.REQUIRED)
        @PositiveOrZero int salePrice,

        @Schema(description = "카테고리", example = "ELECTRONICS/HEADSET", requiredMode = Schema.RequiredMode.REQUIRED)
        @NotBlank String category,

        @Schema(description = "썸네일 URL(https 권장)", example = "https://cdn.example.com/products/air-s9/thumb.webp", requiredMode = Schema.RequiredMode.REQUIRED)
        @NotBlank String thumbnailUrl,

        @Schema(description = "상세 HTML", example = "<h2>상품 소개</h2><p>ANC, 24h</p>", requiredMode = Schema.RequiredMode.REQUIRED)
        @NotBlank String detailHtml,

        @Schema(description = "총 재고 수량(옵션이 없으면 필수)", example = "100", minimum = "0", requiredMode = Schema.RequiredMode.REQUIRED)
        @PositiveOrZero int stockTotal,

        @Schema(description = "피드백 포인트(원)", example = "500", minimum = "0", requiredMode = Schema.RequiredMode.REQUIRED)
        @PositiveOrZero int feedbackPoint,

        @Schema(description = "판매 시작 시각", type = "string", format = "date-time", example = "2025-09-01T10:00:00")
        @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
        LocalDateTime saleStartAt,

        @Schema(description = "판매 종료 시각", type = "string", format = "date-time", example = "2025-09-30T23:59:59")
        @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
        LocalDateTime saleEndAt,

        // ===== 옵션 라벨(최대 5) =====
        @Schema(description = "옵션1 라벨", example = "색깔") String option1Name,
        @Schema(description = "옵션2 라벨", example = "사이즈") String option2Name,
        @Schema(description = "옵션3 라벨") String option3Name,
        @Schema(description = "옵션4 라벨") String option4Name,
        @Schema(description = "옵션5 라벨") String option5Name,

        // ===== 옵션 조합 목록(없으면 단일 SKU 자동 생성) =====
        @Schema(description = "옵션 조합(SKU) 목록") List<ProductVariantCreateRequest> variants
) {}
