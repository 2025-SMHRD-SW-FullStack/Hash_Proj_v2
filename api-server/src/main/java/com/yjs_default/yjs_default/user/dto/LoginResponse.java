package com.yjs_default.yjs_default.user.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
@Schema(description = "로그인 응답 DTO")
public class LoginResponse {

    @Schema(description = "JWT 토큰", example = "eyJhbGciOiJIUzI1NiIsIn...")
    private String token;

    @Schema(description = "사용자 정보")
    private UserResponse user;

}

