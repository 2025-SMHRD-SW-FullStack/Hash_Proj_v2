package com.ressol.ressol.review.dto;

public record ReviewDraftRequest(
        String keywordsJson,
        String content,
        String photosJson,
        String reviewUrl
) {}

