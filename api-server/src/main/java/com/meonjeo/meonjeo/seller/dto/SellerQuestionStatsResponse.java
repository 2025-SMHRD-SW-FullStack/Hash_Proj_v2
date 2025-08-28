package com.meonjeo.meonjeo.seller.dto;

import com.meonjeo.meonjeo.survey.QuestionType;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

public record SellerQuestionStatsResponse(
        Long productId,
        String category,
        LocalDate from,
        LocalDate to,
        List<QuestionStat> questions
) {
    public record QuestionStat(
            String code,
            String label,
            QuestionType type,
            Double average,            // SCALE인 경우만
            Map<String, Long> buckets  // SCALE: "1".."5", CHOICE: 각 옵션값, NA는 "NA"
    ) {}
}
