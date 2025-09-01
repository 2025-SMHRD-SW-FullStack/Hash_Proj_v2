package com.meonjeo.meonjeo.auth.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@Schema(description = "비밀번호 재설정 요청")
public class PasswordResetRequest {

    @NotBlank @Email
    @Schema(description = "로그인 아이디(이메일)", example = "user@example.com")
    private String loginId;

    @NotBlank
    @Schema(description = "휴대폰 번호(사용자 입력 원문)", example = "01012345678")
    private String phoneNumber;

    @NotBlank
    @Schema(description = "문자인증 성공 후 발급된 단기 토큰")
    private String phoneVerifyToken;

    @NotBlank
    @Schema(description = "새 비밀번호")
    private String newPassword;

    @NotBlank
    @Schema(description = "새 비밀번호 확인")
    private String newPasswordConfirm;
}
