package com.meonjeo.meonjeo.order.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;

import java.util.List;

@Schema(
        name = "CheckoutRequest",
        description = "주문 결제 요청(주소록 기반)",
        example = """
        {
          "addressId": 1,
          "requestMemo": "문 앞에 놓아주세요",
          "useAllPoint": false,
          "usePoint": 500,
          "items": [
            { "productId": 1, "qty": 2, "options": { "색깔": "레드", "사이즈": "XL" } },
            { "productId": 1, "qty": 1, "options": { "색깔": "레드", "사이즈": "M" } }
          ]
        }
        """
)
public record CheckoutRequest(

        // 선택한 배송지 ID (로그인 사용자의 주소록)
        @Schema(description = "배송지 ID(주소록)", example = "3", requiredMode = Schema.RequiredMode.REQUIRED)
        @NotNull Long addressId,

        // 배송 요청사항(선택)
        @Schema(description = "배송 요청사항(선택)", example = "문 앞에 놓아주세요")
        @Size(max = 200)                     // ✅ 최대 200자
        String requestMemo,

        // true면 보유 포인트 전액 사용
        @Schema(description = "보유 포인트 전액 사용 여부", example = "false")
        boolean useAllPoint,

        // 부분 사용 포인트(원) — useAllPoint=false일 때만 의미
        @Schema(description = "부분 사용 포인트(원). useAllPoint=false일 때만 적용", example = "500", minimum = "0")
        @PositiveOrZero int usePoint,

        // 품목 목록
        @Schema(description = "주문 품목 목록(최소 1개)", requiredMode = Schema.RequiredMode.REQUIRED)
        @NotNull @Valid List<CheckoutItem> items
) {}
