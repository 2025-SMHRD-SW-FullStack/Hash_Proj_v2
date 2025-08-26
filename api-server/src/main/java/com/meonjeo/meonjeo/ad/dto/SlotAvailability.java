package com.meonjeo.meonjeo.ad.dto;

import io.swagger.v3.oas.annotations.media.Schema;

/**
 * 날짜별 슬롯 가용 상태(한 날짜에 대한 특정 슬롯 포지션의 가능 여부).
 */
@Schema(description = "슬롯 가용 상태")
public record SlotAvailability(
        @Schema(description = "슬롯 ID", example = "11")
        Long slotId,

        @Schema(description = "포지션", example = "3")
        int position,

        @Schema(description = "가용 여부", example = "true")
        boolean available
) {}
