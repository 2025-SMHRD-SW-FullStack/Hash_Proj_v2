package com.ressol.ressol.review.dto;

import com.ressol.ressol.review.ReviewMissionType;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;

import java.util.List;
import java.util.Map;

@Schema(description = "Step3 통합 생성 요청(사장님 키워드 1~5 + 사장님 직접 입력 1~3)")
public record ReviewGenerateFormRequest(

        @NotNull
        @Schema(description = "미션 ID", example = "1001")
        Long missionId,

        @NotNull
        @Schema(description = "미션 종류", example = "NAVER_PLACE")
        ReviewMissionType missionType,

        @NotNull
        @Schema(description = "사장님이 제공한 후보 키워드 (필수: 1~5개)", example = "[\"양 많음\",\"친절함\"]")
        List<String> ownerKeywords,

        @NotNull
        @Schema(description = "사장님이 직접 입력한 키워드 (필수: 1~3개)", example = "[\"사진 맛집\",\"빠른 배달\"]")
        List<String> userKeywords,

        @Schema(description = "업로드된 미디어 ID 목록(선택)", example = "[11,12]")
        List<Long> mediaIds,

        @Schema(description = "플랫폼(선택)", example = "NAVER_STORE")
        String platform,

        @Schema(description = "추가 파라미터(charLimit 등)", example = "{\"charLimit\":700}")
        Map<String, Object> extras
) {}
