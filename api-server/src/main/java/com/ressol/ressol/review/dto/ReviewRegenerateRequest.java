package com.ressol.ressol.review.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;

import java.util.List;
import java.util.Map;

@Schema(description = "리뷰 재생성 요청")
public record ReviewRegenerateRequest(

        @NotNull
        @Schema(description = "재생성할 리뷰 ID", example = "2001")
        Long reviewId,

        @Schema(description = "재생성 시 반영하고 싶은 키워드(선택)", example = "[\"상세사진 강조\",\"가격 대비 만족\"]")
        List<String> adjustKeywords,

        @Schema(description = "재생성 시 톤 조정(선택)", example = "전문가톤")
        String adjustTone,

        @Schema(description = "희망 글자수(선택)", example = "900")
        Integer desiredLength,

        @Schema(description = "플랫폼(선택)", example = "NAVER_STORE")
        String platform,

        @Schema(description = "사용자가 편집한 본문(선택) — 편집본 기반 재생성에 사용", example = "제가 직접 다듬은 문장입니다...")
        String baseEditedText,

        @Schema(description = "사용자 커스텀 프롬프트(선택) — 프롬프트 기반 재생성에 사용", example = "담백하게, 사실 위주로, 과장 금지")
        String customPrompt,

        @Schema(description = "추가 파라미터(선택). 예: {\"temperature\":0.4}", example = "{\"temperature\":0.4}")
        Map<String, Object> extras
) {}
