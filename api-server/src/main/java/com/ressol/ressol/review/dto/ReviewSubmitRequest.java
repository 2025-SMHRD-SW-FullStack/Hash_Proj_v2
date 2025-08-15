package com.ressol.ressol.review.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;

@Schema(description = "리뷰 제출 요청")
public record ReviewSubmitRequest(

        @NotNull
        @Schema(description = "제출할 리뷰 ID", example = "2001")
        Long reviewId
) {}
