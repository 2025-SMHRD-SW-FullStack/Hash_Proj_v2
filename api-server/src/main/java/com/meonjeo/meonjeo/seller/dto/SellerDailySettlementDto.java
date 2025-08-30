package com.meonjeo.meonjeo.seller.dto;

import java.time.LocalDate;

public record SellerDailySettlementDto(
        LocalDate day,
        long ordersCount,
        long itemTotal,       // Σ(oi.unitPrice * oi.qty)
        long feedbackTotal,   // 피드백 작성건의 Σ(oi.feedbackPointSnapshot * oi.qty)
        long platformFee,     // 수수료(3%) 합계
        long payoutTotal      // itemTotal - feedbackTotal - platformFee
) {}
