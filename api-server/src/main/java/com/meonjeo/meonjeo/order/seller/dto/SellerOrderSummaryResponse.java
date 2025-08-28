package com.meonjeo.meonjeo.order.seller.dto;

import com.meonjeo.meonjeo.common.OrderStatus;
import io.swagger.v3.oas.annotations.media.Schema;

import java.time.LocalDateTime;

@Schema(description = "셀러 주문 목록 요약")
public record SellerOrderSummaryResponse(
        @Schema(description = "주문 ID") Long id,
        @Schema(description = "주문번호") String orderUid,
        @Schema(description = "주문 상태") OrderStatus status,
        @Schema(description = "구매자 사용자 ID") Long buyerUserId,
        @Schema(description = "셀러 소계(해당 셀러 아이템 금액 합)") int sellerSubtotal,
        @Schema(description = "아이템 수량 합(해당 셀러)") int itemCount,
        @Schema(description = "주문 생성 시각") LocalDateTime createdAt,
        @Schema(description = "수취인") String receiver,
        @Schema(description = "연락처") String phone
) {}
