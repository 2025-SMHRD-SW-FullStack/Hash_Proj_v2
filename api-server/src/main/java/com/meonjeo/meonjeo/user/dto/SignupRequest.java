package com.meonjeo.meonjeo.user.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Schema(name = "SignupRequest", description = "로컬 회원가입 요청 DTO (리쏠 스펙)")
public class SignupRequest {

    @Schema(description = "이메일", example = "test@example.com", requiredMode = Schema.RequiredMode.REQUIRED)
    private String email;

    @Schema(description = "비밀번호", example = "password123!", requiredMode = Schema.RequiredMode.REQUIRED)
    private String password;

    @Schema(description = "비밀번호 확인", example = "password123!", requiredMode = Schema.RequiredMode.REQUIRED)
    private String confirmPassword;

    @Schema(description = "실명", example = "홍길동", requiredMode = Schema.RequiredMode.REQUIRED)
    private String name;

    @Schema(description = "네이버 닉네임(표시명)", example = "길동킴", requiredMode = Schema.RequiredMode.REQUIRED)
    private String naverNickname;

    @Schema(description = "전화번호 (raw 또는 E.164)", example = "010-1234-5678", requiredMode = Schema.RequiredMode.REQUIRED)
    private String phoneNumber;

    @Schema(description = "휴대폰 본인인증 토큰(verify 성공 시 발급)", example = "eyJhbGciOiJIUzI1NiIs...", requiredMode = Schema.RequiredMode.REQUIRED)
    private String phoneVerifyToken;

    @Schema(description = "주소", example = "서울특별시 강남구 테헤란로 123", requiredMode = Schema.RequiredMode.REQUIRED)
    private String address;

    @Schema(description = "생년월일 (yyyy-MM-dd 또는 yyyyMMdd)", example = "1994-12-21")
    private String birthDate;

    @Schema(description = "성별 (M,F,UNKNOWN)", example = "M")
    private String gender;

    @Schema(description = "추천인", example = "friend_code_123")
    private String referrer;

    @Schema(description = "네이버 리뷰 URL", example = "https://m.place.naver.com/my/review/12345")
    private String naverReviewUrl;
}
