package com.meonjeo.meonjeo.ad.dto;

import io.swagger.v3.oas.annotations.media.Schema;

/**
 * 전체 탭 랜덤 샘플 아이템(카테고리별 N개).
 */
@Schema(description = "전체 탭 랜덤 샘플 아이템")
public record OverallSampleItem(
        @Schema(description = "카테고리명", example = "beauty")
        String category,

        @Schema(description = "상품 ID", example = "456")
        Long productId,

        @Schema(description = "하우스 광고 여부(true면 플랫폼 기본광고)", example = "false")
        boolean house,

        @Schema(description = "배너 이미지 URL(하우스 또는 배너가 있는 경우만 사용)", example = "https://cdn.meonjeo.dev/house/ad_01.png")
        String bannerImageUrl
) {}
