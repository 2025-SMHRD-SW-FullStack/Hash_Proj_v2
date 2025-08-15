package com.ressol.ressol.review.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;

@Schema(description = "자동저장 요청")
public record ReviewAutosaveRequest(

        @NotNull
        @Schema(description = "미션 ID", example = "1001")
        Long missionId,

        @NotNull
        @Schema(description = "현재 작성 중 본문(빈 문자열 허용)", example = "작성 중 본문입니다...")
        String content,

        @Schema(description = "클라이언트가 알고 있는 현재 버전(최초 호출 시 생략 가능)", example = "0")
        Long expectedVersion
) {}
