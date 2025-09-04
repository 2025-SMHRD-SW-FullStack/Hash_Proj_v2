package com.meonjeo.meonjeo.seller.dto;

import java.time.LocalDateTime;
import java.util.List;

public record SellerFeedbackDetailResponse(
        Long   feedbackId,
        String orderUid,
        Long   productId,
        String productName,
        Long   buyerId,
        String buyer,              // 닉네임 우선, 없으면 수령인
        String reportStatus,       // PENDING / APPROVED / REJECTED / null
        String feedbackContent,
        List<String> images,       // Feedback.imagesJson 파싱 결과
        LocalDateTime feedbackCreatedAt,
        LocalDateTime deliveredAt,
        LocalDateTime deadlineAt   // deliveredAt + 7일 (자정)
) {}
