package com.meonjeo.meonjeo.feedback.dto;

public record FeedbackUpdateRequest(
        String content,    // null이면 유지
        String imagesJson  // null이면 유지
) {}
