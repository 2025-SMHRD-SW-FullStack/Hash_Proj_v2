package com.meonjeo.meonjeo.ad.dto;

import io.swagger.v3.oas.annotations.media.Schema;

/**
 * 하우스 광고 포함 버전의 당일 노출 아이템.
 * 빈 슬롯은 house=true로 채워집니다.
 */
@Schema(description = "당일 노출 아이템(하우스 포함)")
public record ServeItemFilled(
        @Schema(description = "슬롯 ID", example = "11")
        Long slotId,

        @Schema(description = "슬롯 포지션", example = "4")
        Integer position,

        @Schema(description = "노출 상품 ID(하우스 광고면 null 가능)", example = "456")
        Long productId,

        @Schema(description = "하우스 광고 여부", example = "false")
        boolean house,

        @Schema(description = "배너 이미지 URL(MAIN_* 또는 하우스 채움)", example = "https://cdn.meonjeo.dev/house/ad_fallback.png")
        String bannerImageUrl
) {}
