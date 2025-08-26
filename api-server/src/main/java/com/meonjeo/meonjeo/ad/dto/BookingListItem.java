package com.meonjeo.meonjeo.ad.dto;

import com.meonjeo.meonjeo.ad.AdSlotType;
import io.swagger.v3.oas.annotations.media.Schema;

import java.time.LocalDate;

/**
 * 내 광고 예약 목록 아이템.
 */
@Schema(description = "내 광고 예약 목록 아이템")
public record BookingListItem(
        @Schema(description = "예약 ID", example = "123")
        Long id,

        @Schema(description = "광고 슬롯 타입", implementation = AdSlotType.class, example = "MAIN_SIDE")
        AdSlotType type,

        @Schema(description = "슬롯 포지션", example = "2")
        Integer position,

        @Schema(description = "카테고리(CATEGORY_TOP일 때만)", example = "electronics")
        String category,

        @Schema(description = "게재 시작일(포함)", example = "2025-09-10")
        LocalDate startDate,

        @Schema(description = "게재 종료일(포함)", example = "2025-09-12")
        LocalDate endDate,

        @Schema(description = "결제 금액(KRW)", example = "1500")
        int price,

        @Schema(description = "예약 상태(RESERVED_UNPAID|ACTIVE|COMPLETED|CANCELLED)", example = "RESERVED_UNPAID")
        String status
) {}
