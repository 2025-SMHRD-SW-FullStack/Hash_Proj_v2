package com.meonjeo.meonjeo.analytics.dto;

import lombok.Builder;

import java.util.List;
import java.util.Map;

@Builder
public record ProductSnapshotResponse(
        Long productId,
        String productName,
        String category,
        Integer buyerSample,          // 금일 구매건수
        Map<Integer, Long> ratingCountsToday,
        Double averageToday,
        List<String> recentFeedbackTexts // 최신 N개
) {}
