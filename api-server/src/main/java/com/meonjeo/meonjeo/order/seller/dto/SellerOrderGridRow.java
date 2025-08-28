package com.meonjeo.meonjeo.order.seller.dto;

import io.swagger.v3.oas.annotations.media.Schema;

import java.time.LocalDateTime;

@Schema(description = "셀러 주문관리 그리드 행")
public record SellerOrderGridRow(
        @Schema(description = "주문 ID") Long id,
        @Schema(description = "주문번호") String orderUid,
        @Schema(description = "주문일") LocalDateTime orderDate,
        @Schema(description = "상태(배송 타임라인 원문 또는 매핑)") String statusText,
        @Schema(description = "택배사") String courierName,
        @Schema(description = "송장번호") String trackingNo,
        @Schema(description = "피드백 마감(D-값)") String feedbackDue,
        @Schema(description = "상품명 요약(예: 상품A 외 2건)") String productName,
        @Schema(description = "받는이") String receiver,
        @Schema(description = "주소(합쳐서)") String address,
        @Schema(description = "연락처") String phone,
        @Schema(description = "배송요청사항") String requestMemo
) {}
