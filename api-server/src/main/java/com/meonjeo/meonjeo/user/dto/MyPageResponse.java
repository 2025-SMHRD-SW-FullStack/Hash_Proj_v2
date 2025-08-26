package com.meonjeo.meonjeo.user.dto;

import com.meonjeo.meonjeo.auth.AuthProvider;
import com.meonjeo.meonjeo.user.User;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

@Getter
@Schema(name = "MyPageResponse", description = "마이페이지 응답 DTO")
public class MyPageResponse {

    private Long id;
    private String email;
    private String nickname;
    private String profileImageUrl;
    private String phoneNumber;
    private boolean phoneVerified;
    private String gender;
    private String birthDate;
    private String provider;
    private boolean socialUser;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public MyPageResponse(User u) {
        this.id = u.getId();
        this.email = u.getEmail();
        this.nickname = u.getNickname();
        this.profileImageUrl = u.getProfileImageUrl();
        this.phoneNumber = u.getPhoneNumber();
        this.phoneVerified = u.isPhoneVerified();
        this.gender = u.getGender() != null ? u.getGender().name() : null;
        this.birthDate = u.getBirthDate() != null ? u.getBirthDate().format(DateTimeFormatter.ISO_LOCAL_DATE) : null;
        this.provider = u.getProvider() != null ? u.getProvider().name() : null;
        this.socialUser = u.getProvider() != null && u.getProvider() != AuthProvider.LOCAL;
        this.createdAt = u.getCreatedAt();
        this.updatedAt = u.getUpdatedAt();
    }
}
