package com.yjs_default.yjs_default.user;

import com.yjs_default.yjs_default.auth.AuthProvider;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {

    // 기존 메서드
    Optional<User> findByEmail(String email);
    boolean existsByEmail(String email);

    // ✅ 소셜 로그인 대응용 복합키 메서드
    Optional<User> findByProviderAndProviderId(AuthProvider provider, String providerId);

    // ✅ 이메일 + 소셜 여부로 사용자 존재 여부 확인
    boolean existsByEmailAndProvider(String email, AuthProvider provider);

    boolean existsByProviderAndProviderId(AuthProvider provider, String providerId);

}
