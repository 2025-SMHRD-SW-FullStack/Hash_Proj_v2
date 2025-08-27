// src/main/java/com/meonjeo/meonjeo/order/dto/CheckoutResponse.java
package com.meonjeo.meonjeo.order.dto;

import io.swagger.v3.oas.annotations.media.Schema;

/**
 * [프론트 가이드]
 * - orderDbId: DB 주문 PK
 * - orderId  : 결제사에 전달할 주문 UID
 * - totalPrice: 상품 총액(배송비 제외)
 * - shippingFee: 배송비(고정 3,000원)
 * - usedPoint : 사용 포인트
 * - payAmount : 실제 결제 금액( totalPrice + shippingFee - usedPoint ). 0원 결제 가능.
 */
@Schema(name = "CheckoutResponse", description = "결제 요청 응답")
public record CheckoutResponse(

        @Schema(description = "DB 주문 PK", example = "12345")
        Long orderDbId,

        @Schema(description = "주문 UID(결제사에 전달할 ID)", example = "ORD-20250825-ABCD1234")
        String orderId,

        @Schema(description = "상품 총액(원)", example = "198000")
        int totalPrice,

        @Schema(description = "배송비(원)", example = "3000")
        int shippingFee,

        @Schema(description = "사용 포인트(원)", example = "5000")
        int usedPoint,

        @Schema(description = "실제 결제 금액(원)", example = "196000")
        int payAmount
) {}
