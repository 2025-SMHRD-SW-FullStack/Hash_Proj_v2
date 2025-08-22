package com.meonjeo.meonjeo.auth.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Schema(name = "PhoneVerifyTokenResponse", description = "SMS 본인인증 완료 후 발급되는 단기 토큰(약 10분 유효)")
public class PhoneVerifyTokenResponse {

    @Schema(
            description = "본인인증 토큰 (Short JWT 등, 서버에서 검증용)",
            example = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.short.payload.signature",
            requiredMode = Schema.RequiredMode.REQUIRED
    )
    @JsonProperty("phoneVerifyToken")
    private String phoneVerifyToken;
}
