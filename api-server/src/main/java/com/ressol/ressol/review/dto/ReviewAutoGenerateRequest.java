package com.ressol.ressol.review.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;

@Schema(description = "최소 입력값 기반 자동 생성 요청")
public record ReviewAutoGenerateRequest(
        @Schema(description = "미션 ID", example = "1001")
        @NotNull Long missionId
) {}