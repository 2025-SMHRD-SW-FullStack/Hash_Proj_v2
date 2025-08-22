package com.meonjeo.meonjeo.review.dto;

import java.time.LocalDateTime;

public record ReviewDraftDto(
        Long applicationId,
        String content,
        String photosJson,
        String reviewUrl,
        String keywordsJson,
        LocalDateTime updatedAt
) {}
