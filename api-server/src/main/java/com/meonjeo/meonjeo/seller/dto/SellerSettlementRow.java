package com.meonjeo.meonjeo.seller.dto;

import java.time.LocalDateTime;

public record SellerSettlementRow(
        Long orderId,
        String orderUid,
        LocalDateTime confirmedAt,
        long itemTotal,
        long feedbackTotal,
        long platformFee,
        long payout,
        boolean feedbackDone
) {}
