package com.meonjeo.meonjeo.user.dto;

import com.meonjeo.meonjeo.auth.AuthProvider;
import com.meonjeo.meonjeo.user.User;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;

import java.time.format.DateTimeFormatter;

@Getter
@Schema(name = "UserResponse", description = "사용자 응답 DTO")
public class UserResponse {

    private Long id;
    private String email;
    private String name;
    private String naverNickname;
    private String phoneNumber;
    private boolean phoneVerified;
    private String address;
    private String gender;
    private String birthDate;
    private String ageGroup;
    private String referrer;
    private String naverReviewUrl; // ✅ 유지
    private String provider;
    private boolean socialUser;

    public UserResponse(User user) {
        this.id = user.getId();
        this.email = user.getEmail();
        this.name = user.getName();
        this.naverNickname = user.getNaverNickname();
        this.phoneNumber = user.getPhoneNumber();
        this.phoneVerified = user.isPhoneVerified();
        this.address = user.getAddress();
        this.gender = user.getGender() != null ? user.getGender().name() : null;
        this.birthDate = user.getBirthDate() != null ? user.getBirthDate().format(DateTimeFormatter.ISO_LOCAL_DATE) : null;
        this.ageGroup = user.getAgeGroup() != null ? user.getAgeGroup().name() : null;
        this.referrer = user.getReferrer();
        this.naverReviewUrl = user.getNaverReviewUrl();
        this.provider = user.getProvider() != null ? user.getProvider().name() : null;
        this.socialUser = user.getProvider() != null && user.getProvider() != AuthProvider.LOCAL;
    }
}
