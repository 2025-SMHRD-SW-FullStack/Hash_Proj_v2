package com.meonjeo.meonjeo.cart.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Min;

@Schema(name="UpdateCartItemQtyRequest")
public record UpdateCartItemQtyRequest(
        @Schema(description="수량(1이상)", example="3", minimum="1")
        @Min(1) int qty
) {}
