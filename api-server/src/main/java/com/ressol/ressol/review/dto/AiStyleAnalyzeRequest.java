package com.ressol.ressol.review.dto;

import java.util.List;

public record AiStyleAnalyzeRequest(
        Long userId,
        List<String> texts,
        List<String> imageUrls
) {}
