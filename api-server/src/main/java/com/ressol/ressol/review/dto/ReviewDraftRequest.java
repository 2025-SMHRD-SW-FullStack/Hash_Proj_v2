package com.ressol.ressol.review.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;

@Schema(description = "초안 저장/수정 요청")
public record ReviewDraftRequest(

        @NotNull
        @Schema(description = "미션 ID", example = "1001")
        Long missionId,

        @NotNull
        @Schema(description = "초안 본문", example = "초안 내용...")
        String content
) {}
