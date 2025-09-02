package com.meonjeo.meonjeo.user.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.*;
import lombok.Getter;
import lombok.Setter;

@Getter @Setter
@Schema(name = "SignupRequest", description = "회원가입 폼(필수)")
public class SignupRequest {

    @Schema(description = "프로필 이미지 URL", example = "https://.../me.png", requiredMode = Schema.RequiredMode.REQUIRED)
    private String profileImageUrl;

    @Schema(description = "아이디(이메일)", example = "me@example.com", requiredMode = Schema.RequiredMode.REQUIRED)
    @Email @NotBlank
    private String email;

    @Schema(description = "비밀번호", example = "password123!", requiredMode = Schema.RequiredMode.REQUIRED)
    @NotBlank @Size(min = 8, max = 64)
    private String password;

    @Schema(description = "비밀번호 확인", example = "password123!", requiredMode = Schema.RequiredMode.REQUIRED)
    @NotBlank
    private String confirmPassword;

    @Schema(description = "닉네임", example = "먼저써봄러", requiredMode = Schema.RequiredMode.REQUIRED)
    @NotBlank @Size(min = 2, max = 50)
    private String nickname;

    @Schema(description = "핸드폰 번호(숫자만)", example = "01012345678", requiredMode = Schema.RequiredMode.REQUIRED)
    @NotBlank @Pattern(regexp = "^[0-9]{9,13}$")
    private String phoneNumber;

    @Schema(description = "휴대폰 본인인증 토큰(verify 성공 시 발급)", example = "eyJhbGciOiJIUzI1NiIs...", requiredMode = Schema.RequiredMode.REQUIRED)
    @NotBlank
    private String phoneVerifyToken;   // 컨트롤러와 동일 이름

    @Schema(description = "성별(M,F,UNKNOWN)", example = "M", requiredMode = Schema.RequiredMode.REQUIRED)
    @NotBlank @Pattern(regexp = "M|F|UNKNOWN")
    private String gender;

    @Schema(description = "생년월일(yyyy-MM-dd 또는 yyyyMMdd)", example = "1999-08-25", requiredMode = Schema.RequiredMode.REQUIRED)
    @NotBlank
    private String birthDate;
}
