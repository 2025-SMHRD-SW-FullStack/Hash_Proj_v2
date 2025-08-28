package com.meonjeo.meonjeo.order.seller.dto;

import com.meonjeo.meonjeo.common.OrderStatus;
import io.swagger.v3.oas.annotations.media.Schema;

import java.time.LocalDateTime;
import java.util.List;

@Schema(description = "셀러 주문 상세")
public record SellerOrderDetailResponse(
        @Schema(description = "주문 ID") Long id,
        @Schema(description = "주문번호") String orderUid,
        @Schema(description = "주문 상태") OrderStatus status,
        @Schema(description = "구매자 사용자 ID") Long buyerUserId,
        @Schema(description = "수취인") String receiver,
        @Schema(description = "연락처") String phone,
        @Schema(description = "주소1") String addr1,
        @Schema(description = "주소2") String addr2,
        @Schema(description = "우편번호") String zipcode,
        @Schema(description = "배송 메모") String requestMemo,
        @Schema(description = "배송비") int shippingFee,
        @Schema(description = "주문 생성 시각") LocalDateTime createdAt,
        @Schema(description = "구매 확정 시각") LocalDateTime confirmedAt,
        @Schema(description = "셀러 소유 아이템 목록") List<SellerOrderItemView> items,
        @Schema(description = "셀러 소계(해당 셀러 아이템 금액 합)") int sellerSubtotal,
        @Schema(description = "배송 타임라인(택배사/송장/이벤트)") List<ShippingTimelineView> shipments
) {}
