package com.meonjeo.meonjeo.cart.dto;

import io.swagger.v3.oas.annotations.media.Schema;

import java.util.List;

@Schema(name="CartViewResponse")
public record CartViewResponse(
        List<CartItemView> items,
        int totalPrice,
        int shippingFee,
        int payableBase
) {}
