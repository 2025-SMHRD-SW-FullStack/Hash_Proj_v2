package com.ressol.ressol.review.dto;

import java.util.List;
import java.util.Map;

public record AiReviewRegenerateRequest(
        Long missionId, Long userId, String platform,
        List<String> keywords, List<String> imageUrls,
        String baseEditedText, String customPrompt,
        String userSystemPrompt, Integer charLimit, String previousPrompt
) {}