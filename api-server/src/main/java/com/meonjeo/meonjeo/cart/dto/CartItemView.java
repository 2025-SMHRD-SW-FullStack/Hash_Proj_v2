package com.meonjeo.meonjeo.cart.dto;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(name="CartItemView")
public record CartItemView(
        Long cartItemId,
        Long productId,
        String productName,
        Long variantId,
        String optionsJson,
        int unitPriceNow,
        int qty,
        int subtotal,
        boolean inStock
) {}
