// src/main/java/com/meonjeo/meonjeo/user/User.java
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
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;

@Entity
@Table(
        name = "users",
        uniqueConstraints = {
                @UniqueConstraint(columnNames = {"email"}),
                @UniqueConstraint(columnNames = {"phone_number"}),
                @UniqueConstraint(columnNames = {"provider", "provider_id"})
        },
        indexes = {
                @Index(name = "idx_users_email", columnList = "email"),
                @Index(name = "idx_users_phone", columnList = "phone_number"),
                @Index(name = "idx_users_provider_pid", columnList = "provider, provider_id")
        }
)
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor @Builder
public class User {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /* 필수: 아이디(이메일) */
    @NotBlank @Email @Size(max = 255)
    @Column(name = "email", nullable = false, length = 255)
    private String email;

    /* 필수: 비밀번호(해시 저장) */
    @NotBlank
    @Column(name = "password", nullable = false)
    private String password;

    /* 필수: 닉네임 */
    @NotBlank @Size(max = 50)
    @Column(name = "nickname", nullable = false, length = 50)
    private String nickname;

    /* 필수: 프로필 이미지 URL */
    @Size(max = 500)
    @Column(name = "profile_image_url", nullable = true, length = 500)
    private String profileImageUrl;

    /* 필수: 휴대폰 번호 */
    @Size(max = 20)
    @Column(name = "phone_number", nullable = true, length = 20)
    private String phoneNumber;

    /* 휴대폰 인증 상태/시각 (컨트롤러에서 isPhoneVerified() 사용) */
    @Column(name = "phone_verified", nullable = false)
    @Builder.Default
    private boolean phoneVerified = false;

    @Column(name = "phone_verified_at")
    private LocalDateTime phoneVerifiedAt;

    /* 필수: 성별 */
    public enum Gender { M, F, UNKNOWN }
    @Enumerated(EnumType.STRING)
    @Column(name = "gender", nullable = false, length = 10)
    private Gender gender;

    /* 필수: 생년월일 */
    @Column(name = "birth_date", nullable = false)
    private LocalDate birthDate;

    /* 소셜/로컬 구분 */
    @Enumerated(EnumType.STRING)
    @Column(name = "provider", nullable = false, length = 20)
    private AuthProvider provider; // LOCAL/GOOGLE/NAVER/KAKAO

    @Column(name = "provider_id", length = 100)
    private String providerId; // LOCAL이면 null 가능

    /* 권한/상태 */
    @Enumerated(EnumType.STRING)
    @Column(name = "role", nullable = false, length = 30)
    @Builder.Default
    private Role role = Role.USER;

    @Column(name = "enabled", nullable = false)
    @Builder.Default
    private boolean enabled = true; // 가입 완료 시 즉시 로그인 가능

    /* 시스템 */
    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    /* 편의: 생년월일 파싱 */
    public void setBirthDateFromString(String ymd) {
        if (ymd == null || ymd.isBlank()) throw new IllegalArgumentException("birthDate required");
        try {
            this.birthDate = LocalDate.parse(ymd, DateTimeFormatter.ISO_LOCAL_DATE);
        } catch (DateTimeParseException e) {
            this.birthDate = LocalDate.parse(ymd, DateTimeFormatter.ofPattern("yyyyMMdd"));
        }
    }

    /* 편의: 휴대폰 인증 마킹 */
    public void markPhoneVerified() {
        this.phoneVerified = true;
        this.phoneVerifiedAt = LocalDateTime.now();
    }
}
