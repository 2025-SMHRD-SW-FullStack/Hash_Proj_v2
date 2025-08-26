package com.meonjeo.meonjeo.feedback.dto;

import com.meonjeo.meonjeo.feedback.FeedbackType;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record FeedbackCreateRequest(
        @NotNull Long orderItemId,
        @NotNull FeedbackType type,
        @Min(1) @Max(5) int overallScore,
        @NotBlank String scoresJson,
        @NotBlank String content,
        @NotBlank String imagesJson // 업로드 완료된 URL 리스트 JSON
) {}