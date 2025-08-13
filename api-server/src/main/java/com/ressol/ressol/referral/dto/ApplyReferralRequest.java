package com.ressol.ressol.referral.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

@Getter @Setter
@Schema(name = "ApplyReferralRequest")
public class ApplyReferralRequest {
    @Schema(description = "추천 코드", example = "RS-AB12CD", requiredMode = Schema.RequiredMode.REQUIRED)
    private String code;

    @Schema(description = "캠페인/채널 태그(옵션)", example = "launch_event")
    private String campaign;
}
