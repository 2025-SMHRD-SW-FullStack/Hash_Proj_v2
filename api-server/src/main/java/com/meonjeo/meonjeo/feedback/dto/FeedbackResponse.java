package com.meonjeo.meonjeo.feedback.dto;

public record FeedbackResponse(Long id, Long orderItemId, int overallScore, String content, String imagesJson,
                               Integer awardedPoint, java.time.LocalDateTime awardedAt) {}