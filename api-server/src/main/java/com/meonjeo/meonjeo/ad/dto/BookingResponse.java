package com.meonjeo.meonjeo.ad.dto;

import io.swagger.v3.oas.annotations.media.Schema;

/**
 * 광고 예약 생성 응답.
 */
@Schema(description = "광고 예약 생성 응답")
public record BookingResponse(
        @Schema(description = "생성된 예약 ID", example = "123")
        Long bookingId,

        @Schema(description = "결제 금액(KRW)", example = "3000")
        int price,

        @Schema(description = "예약 상태(RESERVED_UNPAID|ACTIVE|COMPLETED|CANCELLED)", example = "RESERVED_UNPAID")
        String status
) {}
