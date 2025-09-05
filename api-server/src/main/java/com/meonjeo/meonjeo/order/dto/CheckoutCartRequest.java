package com.meonjeo.meonjeo.order.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;
import java.util.List;

@Schema(name="CheckoutCartRequest", description="장바구니 전체 결제 요청")
public record CheckoutCartRequest(
        @Schema(description="주소록 ID", example="3", requiredMode = Schema.RequiredMode.REQUIRED)
        @NotNull Long addressId,

        @Schema(description="배송 요청사항(선택)", example="문 앞에 놓아주세요")
        @Size(max=200) String requestMemo,

        @Schema(description="보유 포인트 전액 사용 여부", example="false")
        boolean useAllPoint,

        @Schema(description="부분 사용 포인트", example="5000", minimum="0")
        @PositiveOrZero int usePoint,

        @Schema(description="결제 요청 후 장바구니 비우기", example="true")
        boolean clearCartAfter,

        @Schema(description="선택한 장바구니 아이템 ID 목록", example="[12,34,56]")
        List<Long> items,

        @Schema(description="선택한 장바구니 아이템 ID 목록(호환 필드)", example="[12,34,56]")
        List<Long> cartItemIds
) {}
