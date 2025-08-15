package com.ressol.ressol.review.dto;

import java.util.List;
import java.util.Map;

public record AiReviewRequest(
        Long missionId,
        Long userId,
        List<String> keywords,
        String tone,   // 정책으로 대체 가능
        String style,  // 정책/플랫폼으로 대체 가능
        Integer charLimit,
        Map<String, Object> extras
) {}