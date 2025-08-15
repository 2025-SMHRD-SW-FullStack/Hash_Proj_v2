package com.ressol.ressol.review.dto;


import java.util.Map;

public record AiReviewResponse(
        String content,
        String usedSystemPrompt,
        String usedUserPrompt,
        String model,
        Map<String, Object> meta
) {}
