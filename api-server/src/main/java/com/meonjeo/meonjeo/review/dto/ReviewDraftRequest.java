package com.meonjeo.meonjeo.review.dto;

public record ReviewDraftRequest(
        String keywordsJson,
        String content,
        String photosJson,
        String reviewUrl
) {}

