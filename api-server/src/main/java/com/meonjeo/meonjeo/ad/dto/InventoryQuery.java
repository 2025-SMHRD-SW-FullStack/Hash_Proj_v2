package com.meonjeo.meonjeo.ad.dto;

import com.meonjeo.meonjeo.ad.AdSlotType;
import io.swagger.v3.oas.annotations.media.Schema;

import java.time.LocalDate;

/**
 * 인벤토리 조회 파라미터(내부용 DTO가 필요할 때 사용).
 */
@Schema(description = "인벤토리 조회 파라미터")
public record InventoryQuery(
        @Schema(description = "슬롯 타입", implementation = AdSlotType.class, example = "CATEGORY_TOP")
        AdSlotType type,

        @Schema(description = "카테고리(CATEGORY_TOP)", example = "beauty")
        String category,

        @Schema(description = "시작일(포함)", example = "2025-09-01")
        LocalDate startDate,

        @Schema(description = "종료일(포함)", example = "2025-09-07")
        LocalDate endDate
) {}
