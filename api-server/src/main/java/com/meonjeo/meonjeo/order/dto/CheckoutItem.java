package com.meonjeo.meonjeo.order.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

import java.util.Map;

/**
 * [프론트 가이드]
 * - productId: 구매할 상품 ID
 * - qty      : 수량(1 이상)
 * - options  : 선택 옵션 맵(옵션 없는 상품이면 null 또는 빈 객체 {}).
 *   * 권장 키: 상품 등록 시의 option1~5 라벨 그대로 (예: {"색깔":"레드","사이즈":"XL"})
 *   * 대안 키: {"option1Value":"레드","option2Value":"XL"} 또는 {"option1":"레드","option2":"XL"}
 *     - 서버가 [라벨 → option{n}Value → option{n}] 순서로 값을 해석함.
 */
@Schema(name = "CheckoutItem", description = "주문 품목")
public record CheckoutItem(

        @Schema(description = "상품 ID", example = "5", requiredMode = Schema.RequiredMode.REQUIRED)
        @NotNull Long productId,

        @Schema(description = "수량(1 이상)", example = "2", minimum = "1", requiredMode = Schema.RequiredMode.REQUIRED)
        @Min(1) int qty,

        @Schema(
                description = "선택 옵션 맵(옵션 없는 상품이면 null 또는 {}). 라벨 키 예: {\"색깔\":\"레드\",\"사이즈\":\"XL\"}",
                // Swagger에서 Map 예시는 문자열로 넣어야 UI에 잘 보임
                example = "{\"색깔\":\"레드\",\"사이즈\":\"XL\"}",
                nullable = true
        )
        Map<String, String> options
) {}
