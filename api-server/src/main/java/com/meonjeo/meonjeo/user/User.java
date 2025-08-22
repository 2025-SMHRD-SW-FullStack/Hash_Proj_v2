package com.meonjeo.meonjeo.user;

import com.meonjeo.meonjeo.auth.AuthProvider;
import jakarta.persistence.*;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.Period;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;

@Entity
@Table(
        name = "users",
        uniqueConstraints = {
                @UniqueConstraint(columnNames = {"email"}),
                @UniqueConstraint(columnNames = {"phone_number"}),
                @UniqueConstraint(columnNames = {"provider", "provider_id"}),
                @UniqueConstraint(columnNames = {"referral_code"})
        },
        indexes = {
                @Index(name = "idx_users_email", columnList = "email"),
                @Index(name = "idx_users_phone", columnList = "phone_number"),
                @Index(name = "idx_users_provider_pid", columnList = "provider, provider_id"),
                @Index(name = "idx_users_referral_code", columnList = "referral_code")
        }
)
@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class User {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /* ===== 로그인 ID ===== */
    @Setter @NotBlank @Email @Size(max = 255)
    @Column(name = "email", nullable = false, length = 255)
    private String email;

    /* ===== 인증(비번) ===== */
    @Setter @NotBlank
    @Column(name = "password", nullable = false)
    private String password;

    /* ===== 연락 ===== */
    @Setter @Size(max = 20)
    @Column(name = "phone_number", length = 20)
    private String phoneNumber;

    @Setter @Column(name = "phone_verified", nullable = false) @Builder.Default
    private boolean phoneVerified = false;

    @Setter @Column(name = "phone_verified_at")
    private LocalDateTime phoneVerifiedAt;

    /* ===== 프로필 ===== */
    @Setter @NotBlank @Size(max = 100)
    @Column(name = "name", nullable = false, length = 100)
    private String name;

    @Setter @Size(max = 50)
    @Column(name = "naver_nickname", length = 50)
    private String naverNickname;

    @Setter @Size(max = 255)
    @Column(name = "address", length = 255)
    private String address;

    @Setter @Enumerated(EnumType.STRING)
    @Column(name = "gender", length = 10)
    private Gender gender; // M, F, UNKNOWN

    /* ✅ 네이버 리뷰 URL (SignupRequest에 존재) */
    @Setter @Size(max = 500)
    @Column(name = "naver_review_url", length = 500)
    private String naverReviewUrl;

    /* ===== 생년월일/연령대 ===== */
    @Setter @Column(name = "birth_date")
    private LocalDate birthDate;

    @Setter @Enumerated(EnumType.STRING)
    @Column(name = "age_group", length = 20)
    private AgeGroup ageGroup;

    /* ===== 추천 ===== */
    @Setter @Size(max = 100)
    @Column(name = "referrer", length = 100)
    private String referrer;

    @Setter @Size(max = 16)
    @Column(name = "referral_code", length = 16, unique = true)
    private String referralCode;

    /* ===== 계정 공통 ===== */
    @Enumerated(EnumType.STRING)
    @Column(name = "provider", nullable = false, length = 20)
    private AuthProvider provider;

    @Column(name = "provider_id", nullable = false, length = 100)
    private String providerId;

    @Setter @Column(name = "enabled", nullable = false) @Builder.Default
    private boolean enabled = false;

    @Enumerated(EnumType.STRING)
    @Column(name = "role", nullable = false, length = 30) @Builder.Default
    private Role role = Role.USER;

    /* ===== 시스템 ===== */
    @CreationTimestamp @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    /* ===== lifecycle ===== */
    @PrePersist @PreUpdate
    private void syncAgeGroup() {
        this.ageGroup = AgeGroup.fromBirthDate(this.birthDate);
    }

    /* ===== 편의 ===== */
    public void markPhoneVerified(String verifiedPhoneE164) {
        this.phoneNumber = verifiedPhoneE164;
        this.phoneVerified = true;
        this.phoneVerifiedAt = LocalDateTime.now();
    }


    public enum Gender { M, F, UNKNOWN }
    public enum AgeGroup {
        TEENS, TWENTIES, THIRTIES, FORTIES, FIFTIES, SIXTIES_PLUS, UNKNOWN;
        public static AgeGroup fromBirthDate(LocalDate birthDate) {
            if (birthDate == null) return UNKNOWN;
            int age = Period.between(birthDate, LocalDate.now()).getYears();
            if (age < 20) return TEENS;
            if (age < 30) return TWENTIES;
            if (age < 40) return THIRTIES;
            if (age < 50) return FORTIES;
            if (age < 60) return FIFTIES;
            return SIXTIES_PLUS;
        }
    }

    public void setBirthDateFromString(String ymd) {
        if (ymd == null || ymd.isBlank()) { this.birthDate = null; return; }
        try {
            this.birthDate = LocalDate.parse(ymd, DateTimeFormatter.ISO_LOCAL_DATE);
        } catch (DateTimeParseException e) {
            this.birthDate = LocalDate.parse(ymd, DateTimeFormatter.ofPattern("yyyyMMdd"));
        }
    }
}
