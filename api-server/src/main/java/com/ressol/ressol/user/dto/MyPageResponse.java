package com.ressol.ressol.user.dto;

import com.ressol.ressol.auth.AuthProvider;
import com.ressol.ressol.user.User;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

@Getter
@Schema(name = "MyPageResponse", description = "마이페이지 응답 DTO")
public class MyPageResponse {

    @Schema(description = "사용자 ID", example = "1")
    private Long id;

    @Schema(description = "이메일", example = "test@example.com")
    private String email;

    @Schema(description = "실명", example = "홍길동")
    private String name;

    @Schema(description = "네이버 닉네임(표시명)", example = "길동킴")
    private String naverNickname;

    @Schema(description = "전화번호", example = "010-1234-5678")
    private String phoneNumber;

    @Schema(description = "전화번호 인증 여부", example = "true")
    private boolean phoneVerified;

    @Schema(description = "전화 인증 완료 시각", example = "2025-08-12T10:15:30")
    private LocalDateTime phoneVerifiedAt;

    @Schema(description = "주소", example = "서울특별시 강남구 테헤란로 123")
    private String address;

    @Schema(description = "성별 (M,F,UNKNOWN)", example = "M")
    private String gender;

    @Schema(description = "생년월일 (yyyy-MM-dd)", example = "1994-12-21")
    private String birthDate;

    @Schema(description = "연령대", example = "TWENTIES")
    private String ageGroup;

    @Schema(description = "추천인", example = "friend_code_123")
    private String referrer;

    @Schema(description = "네이버 리뷰 URL", example = "https://m.place.naver.com/my/review/12345")
    private String naverReviewUrl;

    @Schema(description = "소셜 제공자 (LOCAL/GOOGLE/KAKAO/NAVER)", example = "LOCAL")
    private String provider;

    @Schema(description = "보유 포인트", example = "2000")
    private Long pointBalance;

    @Schema(description = "내 추천 코드", example = "RS-AB12CD")
    private String myReferralCode;

    @Schema(description = "소셜 로그인 여부", example = "false")
    private boolean socialUser;

    @Schema(description = "가입 일시", example = "2024-01-01T12:34:56")
    private LocalDateTime createdAt;

    @Schema(description = "수정 일시", example = "2024-01-02T09:00:00")
    private LocalDateTime updatedAt;

    public MyPageResponse(User user) {
        this.id = user.getId();
        this.email = user.getEmail();
        this.name = user.getName();
        this.naverNickname = user.getNaverNickname();
        this.phoneNumber = user.getPhoneNumber();
        this.phoneVerified = user.isPhoneVerified();
        this.phoneVerifiedAt = user.getPhoneVerifiedAt();
        this.address = user.getAddress();
        this.gender = user.getGender() != null ? user.getGender().name() : null;
        this.birthDate = user.getBirthDate() != null ? user.getBirthDate().format(DateTimeFormatter.ISO_LOCAL_DATE) : null;
        this.ageGroup = user.getAgeGroup() != null ? user.getAgeGroup().name() : null;
        this.referrer = user.getReferrer();
        this.naverReviewUrl = user.getNaverReviewUrl();
        this.provider = user.getProvider() != null ? user.getProvider().name() : null;
        this.socialUser = user.getProvider() != null && user.getProvider() != AuthProvider.LOCAL;
        this.createdAt = user.getCreatedAt();
        this.updatedAt = user.getUpdatedAt();
    }
}
