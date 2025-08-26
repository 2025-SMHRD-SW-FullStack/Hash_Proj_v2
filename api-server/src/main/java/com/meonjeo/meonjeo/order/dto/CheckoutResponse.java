package com.meonjeo.meonjeo.order.dto;

import io.swagger.v3.oas.annotations.media.Schema;

/**
 * [프론트 가이드]
 * - orderId: Toss 위젯에 넣을 주문 식별자(고유). 서버에서 생성.
 * - totalPrice: 상품 총액(옵션/수량 반영, 포인트/배송비 제외)
 * - usedPoint : 이번 주문에 사용된 포인트
 * - payAmount : 실제 결제 금액(= totalPrice - usedPoint + 배송비 등). 0원 결제도 가능.
 */
@Schema(name = "CheckoutResponse", description = "결제 요청 응답")
public record CheckoutResponse(

        @Schema(description = "DB 주문 PK", example = "12345")
        Long orderDbId,

        @Schema(description = "주문 UID(결제사에 전달할 ID)", example = "ORD-20250825-ABCD1234")
        String orderId,

        @Schema(description = "상품 총액(원)", example = "198000")
        int totalPrice,

        @Schema(description = "사용 포인트(원)", example = "5000")
        int usedPoint,

        @Schema(description = "실제 결제 금액(원)", example = "193000")
        int payAmount
) {}
