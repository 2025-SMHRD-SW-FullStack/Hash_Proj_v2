package com.meonjeo.meonjeo.ad.dto;

import com.meonjeo.meonjeo.ad.AdSlotType;
import io.swagger.v3.oas.annotations.media.Schema;

import java.time.LocalDate;

/**
 * 내 광고 상세(셀러) 응답 DTO.
 */
@Schema(description = "내 광고 상세(셀러) 응답")
public record BookingDetail(
        @Schema(description = "예약 ID", example = "123")
        Long id,

        @Schema(description = "광고 슬롯 타입", implementation = AdSlotType.class, example = "MAIN_ROLLING")
        AdSlotType type,

        @Schema(description = "슬롯 포지션(롤링:1~10, 사이드:1~3, 카테고리:1~5, 주문완료:1~5)", example = "3")
        Integer position,

        @Schema(description = "카테고리명(CATEGORY_TOP일 때만)", example = "beauty")
        String category,

        @Schema(description = "게재 시작일(포함)", example = "2025-09-01")
        LocalDate startDate,

        @Schema(description = "게재 종료일(포함)", example = "2025-09-07")
        LocalDate endDate,

        @Schema(description = "결제 금액(KRW)", example = "3000")
        int price,

        @Schema(description = "예약 상태(RESERVED_UNPAID|ACTIVE|COMPLETED|CANCELLED)", example = "ACTIVE")
        String status,

        @Schema(description = "연결된 상품 ID", example = "456")
        Long productId,

        @Schema(description = "배너 이미지 URL(MAIN_*에서 노출)", example = "https://cdn.meonjeo.dev/ad/banner_2025.png")
        String bannerImageUrl,

        @Schema(description = "편집 가능 여부(게재 전=true)", example = "true")
        boolean editable,

        @Schema(description = "게재 D-값(게재중/종료면 null)", example = "2")
        Integer daysUntilStart
) {}
