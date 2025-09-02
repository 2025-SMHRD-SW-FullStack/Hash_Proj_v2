package com.meonjeo.meonjeo.ad.dto;

import com.meonjeo.meonjeo.ad.AdSlotType;
import io.swagger.v3.oas.annotations.media.Schema;

import java.time.LocalDate;

@Schema(description = "관리자 광고 예약 목록 아이템")
public record AdminBookingItem(
        @Schema(description = "예약 ID") Long id,
        @Schema(description = "슬롯 타입") AdSlotType type,
        @Schema(description = "포지션") Integer position,
        @Schema(description = "카테고리(CATEGORY_TOP일 때만)") String category,

        @Schema(description = "셀러 ID") Long sellerId,
        @Schema(description = "상호명(없으면 null)") String shopName,

        @Schema(description = "상품 ID") Long productId,
        @Schema(description = "상품명(없으면 null)") String productName,

        @Schema(description = "시작일") LocalDate startDate,
        @Schema(description = "종료일") LocalDate endDate,
        @Schema(description = "상태(RESERVED_UNPAID|RESERVED_PAID|ACTIVE|COMPLETED|CANCELLED)") String status
) {}
