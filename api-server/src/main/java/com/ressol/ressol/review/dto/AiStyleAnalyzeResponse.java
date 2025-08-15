package com.ressol.ressol.review.dto;

import java.util.List;

public record AiStyleAnalyzeResponse(
        String toneLabel,
        List<String> styleTags,
        String systemPrompt,
        Integer consumedSamples
) {}