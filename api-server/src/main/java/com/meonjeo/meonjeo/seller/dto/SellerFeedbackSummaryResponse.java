package com.meonjeo.meonjeo.seller.dto;

import java.time.LocalDate;
import java.util.Map;

public record SellerFeedbackSummaryResponse(
        Long productId,
        long totalCount,
        double averageOverallScore,
        Map<Integer, Long> ratingCounts, // 1~5 점수별 개수
        LocalDate from,                  // 요청 기간 에코
        LocalDate to                     // 요청 기간 에코
) {}
