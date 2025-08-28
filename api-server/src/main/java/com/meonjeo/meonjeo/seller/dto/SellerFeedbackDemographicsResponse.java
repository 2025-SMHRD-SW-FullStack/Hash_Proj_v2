package com.meonjeo.meonjeo.seller.dto;

import java.time.LocalDate;
import java.util.List;

public record SellerFeedbackDemographicsResponse(
        Long productId,
        List<GroupStat> byGender,
        List<GroupStat> byAgeRange,
        LocalDate from,
        LocalDate to
) {
    public record GroupStat(
            String key,      // "M","F","UNKNOWN" 또는 "10대","20대",...
            long count,
            double averageOverallScore
    ) {}
}
