package com.ressol.ressol.review.dto;

import com.ressol.ressol.review.ReviewStatus;
import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "리뷰 응답 DTO")
public record ReviewResponse(

        @Schema(description = "리뷰 ID", example = "2001")
        Long id,

        @Schema(description = "미션 ID", example = "1001")
        Long missionId,

        @Schema(description = "작성자 사용자 ID", example = "1")
        Long userId,

        @Schema(description = "상태(DRAFT/SUBMITTED 등)", example = "DRAFT")
        ReviewStatus status,

        @Schema(description = "본문")
        String content,

        @Schema(description = "재생성 횟수", example = "0")
        Integer regenCount,

        @Schema(description = "낙관적 락 버전(자동저장/충돌 처리에 사용)", example = "1")
        Long version
) {}
