package com.meonjeo.meonjeo.seller.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import java.time.LocalDateTime;

@Schema(description = "셀러 피드백 목록 행")
public record SellerFeedbackRow(
        @Schema(description="피드백 ID") Long id,
        @Schema(description="주문번호") String orderUid,
        @Schema(description="상품명") String productName,
        @Schema(description="구매자 닉네임") String buyer,
        @Schema(description="피드백 내용") String feedbackContent,
        @Schema(description="피드백 작성일") LocalDateTime feedbackCreatedAt,
        @Schema(description="배송완료 시각") LocalDateTime deliveredAt,
        @Schema(description="피드백 마감일(배송완료+7일)") LocalDateTime deadlineAt,
        @Schema(description="신고 상태(PENDING/APPROVED/REJECTED/null)") String reportStatus
) {}
