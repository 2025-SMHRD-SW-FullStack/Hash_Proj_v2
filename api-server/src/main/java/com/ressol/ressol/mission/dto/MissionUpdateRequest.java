package com.ressol.ressol.mission.dto;

import com.ressol.ressol.mission.Mission;
import com.fasterxml.jackson.annotation.JsonFormat;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.*;

import java.time.LocalDateTime;

@Schema(
        name = "MissionUpdateRequest",
        description = """
    미션 수정 요청 바디.
    - priceOption: FREE(0원), PARTIAL/FULL(0 초과)
    - quotaDaily ≤ quotaTotal, startAt < endAt 이어야 합니다.
    - (정책) ACTIVE 상태에서는 일부 필드만 수정 허용하도록 서비스단에서 제어합니다.
    """
)
public record MissionUpdateRequest(

        @NotBlank
        @Size(max = 100)
        @Schema(description = "미션 제목(최대 100자)", example = "첫 방문 리뷰 미션 - 내용 보강")
        String title,

        @Schema(description = "미션 설명", example = "사진 2장과 키워드 3개 필수. 방문 인증 사진 포함.")
        String description,

        @NotNull
        @Schema(description = "가격 옵션 (FREE/PARTIAL/FULL)", example = "FREE", requiredMode = Schema.RequiredMode.REQUIRED)
        Mission.PriceOption priceOption,

        @Schema(description = "사용자 본인부담 금액(원). FREE면 0 또는 null, PARTIAL/FULL이면 0 초과", example = "0")
        Integer userPayAmount,

        @NotNull @Min(1)
        @Schema(description = "총 쿼터(전체 가능 수량)", example = "80", requiredMode = Schema.RequiredMode.REQUIRED)
        Integer quotaTotal,

        @NotNull @Min(1)
        @Schema(description = "일일 쿼터(하루 가능 수량)", example = "15", requiredMode = Schema.RequiredMode.REQUIRED)
        Integer quotaDaily,

        @NotNull
        @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
        @Schema(description = "시작 시각(로컬, ISO-8601)", example = "2025-08-15T00:00:00", requiredMode = Schema.RequiredMode.REQUIRED)
        LocalDateTime startAt,

        @NotNull
        @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
        @Schema(description = "종료 시각(로컬, ISO-8601)", example = "2025-08-31T23:59:59", requiredMode = Schema.RequiredMode.REQUIRED)
        LocalDateTime endAt,

        @Min(0)
        @Schema(description = "필수 키워드 개수", example = "3")
        Integer requiredKeywordsCnt,

        @Min(0)
        @Schema(description = "필수 사진 개수", example = "2")
        Integer requiredPhotosCnt
) {
    /* ===== 교차 필드 검증 ===== */

    @AssertTrue(message = "quotaDaily must be <= quotaTotal")
    public boolean isDailyQuotaValid() {
        if (quotaDaily == null || quotaTotal == null) return true; // 개별 @NotNull이 먼저 막음
        return quotaDaily <= quotaTotal;
    }

    @AssertTrue(message = "endAt must be after startAt")
    public boolean isPeriodValid() {
        if (startAt == null || endAt == null) return true;
        return endAt.isAfter(startAt);
    }

    @AssertTrue(message = "userPayAmount rule violated: FREE→0/null, PARTIAL/FULL→>0")
    public boolean isUserPayAmountValid() {
        if (priceOption == null) return true;
        Integer amt = userPayAmount;
        switch (priceOption) {
            case FREE -> { return amt == null || amt == 0; }
            case PARTIAL, FULL -> { return amt != null && amt > 0; }
            default -> { return true; }
        }
    }
}
