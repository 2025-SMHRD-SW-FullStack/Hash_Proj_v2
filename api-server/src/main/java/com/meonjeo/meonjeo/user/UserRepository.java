package com.meonjeo.meonjeo.user;

import com.meonjeo.meonjeo.auth.AuthProvider;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;

import jakarta.persistence.LockModeType;

import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {

    // ===== 기본 =====
    Optional<User> findByEmail(String email);
    boolean existsByEmail(String email);

    // 이메일 대소문자 정규화 안 한다면 이거 유용 (DB collation 따라 선택)
    Optional<User> findByEmailIgnoreCase(String email);

    // 전화번호(중복가입 방지 핵심)
    Optional<User> findByPhoneNumber(String phoneNumber);
    boolean existsByPhoneNumber(String phoneNumber);

    // 이메일 또는 전화 중 하나라도 겹치면 가입 차단용
    boolean existsByEmailOrPhoneNumber(String email, String phoneNumber);

    // ===== 소셜 매핑 =====
    Optional<User> findByProviderAndProviderId(AuthProvider provider, String providerId);
    boolean existsByProviderAndProviderId(AuthProvider provider, String providerId);
    boolean existsByEmailAndProvider(String email, AuthProvider provider);

    // 같은 이메일인데 다른 provider로 진입했는지 체크(병합/가드 로직에 유용)
    Optional<User> findByEmailAndProviderNot(String email, AuthProvider provider);

    // ===== 경합 방지(선택) : 가입/변경 시 잠그고 읽기 =====
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select u from User u where u.email = :email")
    Optional<User> findByEmailForUpdate(String email);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select u from User u where u.phoneNumber = :phone")
    Optional<User> findByPhoneNumberForUpdate(String phone);

    // ✅ 추천코드
    boolean existsByReferralCode(String referralCode);
    Optional<User> findByReferralCode(String referralCode);


}
