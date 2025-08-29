package com.meonjeo.meonjeo.cart.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

import java.util.Map;

@Schema(name="AddCartItemRequest")
public record AddCartItemRequest(
        @Schema(description="상품 ID", example="10", requiredMode = Schema.RequiredMode.REQUIRED)
        @NotNull Long productId,

        @Schema(description="수량(1이상)", example="2", minimum="1", requiredMode = Schema.RequiredMode.REQUIRED)
        @Min(1) int qty,

        @Schema(description="옵션 맵(라벨 키 추천). 예: {\"색깔\":\"레드\",\"사이즈\":\"XL\"}", example="{\"색깔\":\"레드\",\"사이즈\":\"XL\"}")
        Map<String,String> options
) {}
