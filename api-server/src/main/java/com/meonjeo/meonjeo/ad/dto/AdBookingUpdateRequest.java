package com.meonjeo.meonjeo.ad.dto;

import io.swagger.v3.oas.annotations.media.Schema;

/**
 * 내 광고 수정 요청(게재 전만 가능).
 * productId 또는 배너 이미지를 교체할 때 사용합니다.
 */
@Schema(description = "내 광고 수정 요청(게재 전만 가능)")
public record AdBookingUpdateRequest(
        @Schema(description = "교체할 상품 ID(동일 셀러 소유 상품만 허용)", example = "987")
        Long productId,            // 선택: 동일 셀러 소유 상품으로 교체

        @Schema(description = "교체할 배너 이미지 URL(MAIN_* 슬롯에서만 의미)", example = "https://cdn.meonjeo.dev/ad/banner_2025.png")
        String bannerImageUrl      // 선택: 배너 이미지 교체 (MAIN_*에서만 의미)
) {}
