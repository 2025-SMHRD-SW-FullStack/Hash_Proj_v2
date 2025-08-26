package com.meonjeo.meonjeo.user.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

@Getter @Setter
@Schema(name = "UserUpdateRequest", description = "회원정보 수정 DTO (필요 필드만)")
public class UserUpdateRequest {

    @Schema(description = "닉네임", example = "먼저써봄러")
    private String nickname;

    @Schema(description = "프로필 이미지 URL", example = "https://.../me.png")
    private String profileImageUrl;

    @Schema(description = "성별(M,F,UNKNOWN)", example = "M")
    private String gender;

    @Schema(description = "생년월일(yyyy-MM-dd 또는 yyyyMMdd)", example = "1999-08-25")
    private String birthDate;

    // 전화번호 변경은 본인인증과 함께
    @Schema(description = "변경할 전화번호(숫자만)", example = "01012345678")
    private String phoneNumber;

    @Schema(description = "휴대폰 본인인증 토큰", example = "eyJhbGciOi...")
    private String phoneVerifyToken;
}
