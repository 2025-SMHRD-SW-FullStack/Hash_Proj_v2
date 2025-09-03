package com.meonjeo.meonjeo.feedback.dto;

import java.time.LocalDateTime;

public record FeedbackResponse(Long id, Long orderItemId, String optionSnapshotJson, Long productId, String productName, LocalDateTime createdAt, String optionName, int optionsCount, int overallScore, String content, String imagesJson, Integer awardedPoint, java.time.LocalDateTime awardedAt, String scoresJson, String authorNickname, String authorProfileImageUrl, String productImageUrl ) {}