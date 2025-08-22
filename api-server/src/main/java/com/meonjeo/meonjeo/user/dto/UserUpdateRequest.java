package com.meonjeo.meonjeo.user.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Schema(name = "UserUpdateRequest", description = "회원정보 수정 요청 DTO (수정 가능한 필드만 포함)")
public class UserUpdateRequest {

    @Schema(description = "네이버 닉네임(표시명)", example = "길동킴")
    private String naverNickname;

    @Schema(description = "주소", example = "서울특별시 강남구 테헤란로 123")
    private String address;

    @Schema(description = "네이버 리뷰 URL", example = "https://m.place.naver.com/my/review/12345")
    private String naverReviewUrl;

    @Schema(description = "생년월일 (yyyy-MM-dd 또는 yyyyMMdd)", example = "1994-12-21")
    private String birthDate;

    // 전화번호 변경은 본인인증과 함께 처리해야 하므로 옵션으로 둠
    @Schema(description = "변경할 전화번호 (본인인증 필요)", example = "010-9876-5432")
    private String phoneNumber;

    @Schema(description = "휴대폰 본인인증 토큰(verify 성공 시 발급)", example = "eyJhbGciOiJIUzI1NiIs...")
    private String phoneVerifyToken;
}
