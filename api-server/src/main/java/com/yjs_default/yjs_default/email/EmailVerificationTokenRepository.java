package com.yjs_default.yjs_default.email;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.Optional;

@Repository
public interface EmailVerificationTokenRepository extends JpaRepository<EmailVerificationToken, String> {
    Optional<EmailVerificationToken> findByToken(String token);
    void deleteByExpiryDateBefore(LocalDateTime time);
    // ✅ 이메일과 인증 여부로 존재 여부 확인
    boolean existsByEmailAndVerifiedTrue(String email);
}
