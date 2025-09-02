package com.meonjeo.meonjeo.feedback.dto;

import java.time.LocalDateTime;

public record FeedbackResponse(Long id, Long orderItemId, String productName, LocalDateTime createdAt, String optionName, int overallScore, String content, String imagesJson, Integer awardedPoint, java.time.LocalDateTime awardedAt) {}