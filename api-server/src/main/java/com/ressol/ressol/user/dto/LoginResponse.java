package com.ressol.ressol.user.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
@Schema(name = "LoginResponse", description = "로그인/토큰 재발급 응답")
public class LoginResponse {

    @Schema(
            description = "JWT 액세스 토큰 (Bearer)",
            example = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.access.payload.signature",
            requiredMode = Schema.RequiredMode.REQUIRED
    )
    private String accessToken;

    @Schema(
            description = "JWT 리프레시 토큰 (웹은 쿠키로 반환되어 바디에는 null)",
            example = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.refresh.payload.signature",
            nullable = true
    )
    private String refreshToken; // 웹이면 null

    @Schema(
            description = "로그인한 사용자 정보",
            implementation = UserResponse.class,
            requiredMode = Schema.RequiredMode.REQUIRED
    )
    private UserResponse user;
}
