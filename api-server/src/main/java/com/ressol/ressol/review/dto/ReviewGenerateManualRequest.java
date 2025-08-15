package com.ressol.ressol.review.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import java.util.List;
import java.util.Map;

@Schema(name = "ReviewGenerateManualRequest",
        description = "사용자 주도(키워드/톤/스타일)로 AI 리뷰 생성 요청. " +
                "확정되지 않은 값은 extras(Map)에 자유롭게 추가하세요.")
public record ReviewGenerateManualRequest(
        @Schema(description = "미션 ID", example = "1001")
        @NotNull Long missionId,

        @Schema(description = "키워드 목록", example = "[\"배송 빠름\", \"포장 깔끔\"]")
        List<String> keywords,

        @Schema(description = "말투 프리셋", example = "친근한톤")
        String tone,

        @Schema(description = "스타일(블로그/포토/숏폼 등)", example = "블로그")
        String style,

        @Schema(description = "희망 글자수(정책 상한 내)", example = "900")
        Integer desiredLength,

        @Schema(description = "가변 확장 파라미터(필요값 임시 보관)", example =
                "{\"platform\":\"naver\",\"requiredTags\":[\"#체험단\",\"#리쏠\"],\"bannedWords\":[\"최고\"]}")
        Map<String, Object> extras
) {}
