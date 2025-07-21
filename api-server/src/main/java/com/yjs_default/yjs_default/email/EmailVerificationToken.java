package com.yjs_default.yjs_default.email;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@Entity
@Table(name = "email_verification_tokens")
public class EmailVerificationToken {

    @Id
    @Column(length = 36) // UUID 고정 길이
    private String token;  // UUID로 생성

    @Column(nullable = false)
    private String email;

    @Column(nullable = false)
    private boolean verified = false;

    @Column(nullable = false)
    private LocalDateTime expiryDate;

    @CreationTimestamp
    @Column(updatable = false)
    private LocalDateTime createdAt;

    public static EmailVerificationToken create(String email) {
        EmailVerificationToken token = new EmailVerificationToken();
        token.token = UUID.randomUUID().toString();
        token.email = email;
        token.expiryDate = LocalDateTime.now().plusHours(1);
        return token;
    }

    public boolean isExpired() {
        return LocalDateTime.now().isAfter(expiryDate);
    }

    // ✅ 인증 여부 확인
    public boolean isVerified() { return this.verified; }

    // ✅ 인증 완료 처리
    public void markAsVerified() { this.verified = true; }
    // getter/setter 생략
}
