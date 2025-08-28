package com.meonjeo.meonjeo.product.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.PositiveOrZero;

/**
 * [프론트 가이드]
 * - 옵션이 없으면 variants를 생략하거나 빈 배열로 보내세요(서버가 단일 SKU 생성).
 * - 옵션 라벨(optionXName)이 없는 단계의 값(optionXValue)은 보내지 않아도 됩니다.
 */
@Schema(name = "ProductVariantCreateRequest", description = "옵션 조합(SKU) 생성 요청")
public record ProductVariantCreateRequest(

        @Schema(description = "옵션1 값", example = "레드")   String option1Value,
        @Schema(description = "옵션2 값", example = "XL")     String option2Value,
        @Schema(description = "옵션3 값")                     String option3Value,
        @Schema(description = "옵션4 값")                     String option4Value,
        @Schema(description = "옵션5 값")                     String option5Value,

        @Schema(description = "해당 조합 추가금(±원). 음수 가능, 절댓값은 기준가의 50% 이내", example = "-3000")
        int addPrice,

        @Schema(description = "해당 조합 재고", example = "20", minimum = "0")
        @PositiveOrZero int stock
) {}
