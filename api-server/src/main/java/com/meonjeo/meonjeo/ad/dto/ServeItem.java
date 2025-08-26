package com.meonjeo.meonjeo.ad.dto;

import io.swagger.v3.oas.annotations.media.Schema;

/**
 * 당일 노출용 광고 아이템.
 */
@Schema(description = "당일 노출 광고 아이템")
public record ServeItem(
        @Schema(description = "슬롯 ID", example = "11")
        Long slotId,

        @Schema(description = "슬롯 포지션", example = "4")
        Integer position,

        @Schema(description = "노출 상품 ID", example = "456")
        Long productId,

        @Schema(description = "배너 이미지 URL(MAIN_*에서만 노출)", example = "https://cdn.meonjeo.dev/ad/banner_2025.png")
        String bannerImageUrl
) {}
