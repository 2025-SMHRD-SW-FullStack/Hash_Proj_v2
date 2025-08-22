package com.meonjeo.meonjeo.mission.dto;

import com.meonjeo.meonjeo.mission.Mission;
import com.fasterxml.jackson.annotation.JsonFormat;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.*;

import java.time.LocalDateTime;

@Schema(
        name = "MissionCreateRequest",
        description = """
    미션 생성 요청 바디.
    - type: STORE(오프라인 지점용) / PRODUCT(온라인 스토어용)
    - priceOption: FREE(사용자 비용 0), PARTIAL(일부 본인부담), FULL(전액 본인부담)
    - quotaDaily ≤ quotaTotal 이어야 하며, startAt < endAt 여야 합니다.
    """
)
public record MissionCreateRequest(

        /* 소유/연결 */
        @NotNull
        @Schema(description = "회사 ID(내 회사)", example = "1", requiredMode = Schema.RequiredMode.REQUIRED)
        Long companyId,

        @NotNull
        @Schema(description = "채널 ID(오프라인 지점/온라인 스토어)", example = "1", requiredMode = Schema.RequiredMode.REQUIRED)
        Long channelId,

        /* 유형/제목/설명 */
        @NotNull
        @Schema(description = "미션 유형 (STORE=오프라인, PRODUCT=온라인)", example = "STORE", requiredMode = Schema.RequiredMode.REQUIRED)
        Mission.Type type,

        @NotBlank
        @Size(max = 100)
        @Schema(description = "미션 제목(최대 100자)", example = "첫 방문 리뷰 미션")
        String title,

        @Schema(description = "미션 설명", example = "사진 2장과 키워드 3개를 포함해 주세요.")
        String description,

        /* 가격 옵션 */
        @NotNull
        @Schema(description = "가격 옵션 (FREE/PARTIAL/FULL)", example = "FREE", requiredMode = Schema.RequiredMode.REQUIRED)
        Mission.PriceOption priceOption,

        @Schema(description = "사용자 본인부담 금액(원). FREE면 0 또는 null, PARTIAL/FULL이면 0 초과", example = "0")
        Integer userPayAmount,

        /* 쿼터 */
        @NotNull @Min(1)
        @Schema(description = "총 쿼터(전체 가능 수량)", example = "50", requiredMode = Schema.RequiredMode.REQUIRED)
        Integer quotaTotal,

        @NotNull @Min(1)
        @Schema(description = "일일 쿼터(하루 가능 수량)", example = "10", requiredMode = Schema.RequiredMode.REQUIRED)
        Integer quotaDaily,

        /* 진행 기간 */
        @NotNull
        @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
        @Schema(description = "시작 시각(로컬, ISO-8601)", example = "2025-08-18T01:52:36", requiredMode = Schema.RequiredMode.REQUIRED)
        LocalDateTime startAt,

        @NotNull
        @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
        @Schema(description = "종료 시각(로컬, ISO-8601)", example = "2025-08-20T01:52:36", requiredMode = Schema.RequiredMode.REQUIRED)
        LocalDateTime endAt,

        /* 리뷰 요건 */
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
        if (quotaDaily == null || quotaTotal == null) return true;
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
