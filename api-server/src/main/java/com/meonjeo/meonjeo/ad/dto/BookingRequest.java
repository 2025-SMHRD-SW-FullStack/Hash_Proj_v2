package com.meonjeo.meonjeo.ad.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;

/**
 * 광고 예약 생성 요청.
 * 단일 슬롯/상품에 대해 기간(시작~종료)을 지정하여 예약합니다.
 */
@Schema(description = "광고 예약 생성 요청")
public record BookingRequest(

        @Schema(description = "예약할 슬롯 ID", requiredMode = Schema.RequiredMode.REQUIRED, example = "11")
        @NotNull Long slotId,

        @Schema(description = "연결할 상품 ID(셀러 소유)", requiredMode = Schema.RequiredMode.REQUIRED, example = "456")
        @NotNull Long productId,

        @Schema(description = "게재 시작일(포함)", requiredMode = Schema.RequiredMode.REQUIRED, example = "2025-09-01")
        @NotNull LocalDate startDate,

        @Schema(description = "게재 종료일(포함)", requiredMode = Schema.RequiredMode.REQUIRED, example = "2025-09-07")
        @NotNull LocalDate endDate,

        @Schema(description = "배너 이미지 URL(MAIN_*에서 사용, 선택사항)", example = "https://cdn.meonjeo.dev/ads/banner123.jpg")
        String bannerImageUrl,

        @Schema(description = "광고 제목(선택사항)", example = "신제품 출시 기념 특가!")
        String title,

        @Schema(description = "광고 설명(선택사항)", example = "한정 수량 특가로 만나보세요")
        String description
) {}
