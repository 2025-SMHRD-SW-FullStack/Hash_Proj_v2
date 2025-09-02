package com.meonjeo.meonjeo.user;

import com.meonjeo.meonjeo.auth.AuthProvider;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;

import jakarta.persistence.LockModeType;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {

    // 기본
    Optional<User> findByEmail(String email);
    boolean existsByEmail(String email);
    Optional<User> findByEmailIgnoreCase(String email);

    // 전화번호
    Optional<User> findByPhoneNumber(String phoneNumber);
    boolean existsByPhoneNumber(String phoneNumber);

    // 이메일 또는 전화 중 하나라도 겹치면 가입 차단
    boolean existsByEmailOrPhoneNumber(String email, String phoneNumber);

    // 소셜 매핑
    Optional<User> findByProviderAndProviderId(AuthProvider provider, String providerId);
    boolean existsByProviderAndProviderId(AuthProvider provider, String providerId);
    boolean existsByEmailAndProvider(String email, AuthProvider provider);
    Optional<User> findByEmailAndProviderNot(String email, AuthProvider provider);

    // 경합 방지
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select u from User u where u.email = :email")
    Optional<User> findByEmailForUpdate(String email);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select u from User u where u.phoneNumber = :phone")
    Optional<User> findByPhoneNumberForUpdate(String phone);

    // [ADD] Admin user search
    @Query(value = "SELECT u FROM User u LEFT JOIN SellerProfile sp ON u.id = sp.userId " +
            "WHERE (:role is null OR u.role = :role) " +
            "AND (:q is null OR :q = '' OR u.nickname LIKE %:q% OR u.email LIKE %:q% OR sp.shopName LIKE %:q%)",
            countQuery = "SELECT count(u) FROM User u LEFT JOIN SellerProfile sp ON u.id = sp.userId " +
                    "WHERE (:role is null OR u.role = :role) " +
                    "AND (:q is null OR :q = '' OR u.nickname LIKE %:q% OR u.email LIKE %:q% OR sp.shopName LIKE %:q%)")
    Page<User> searchForAdmin(@Param("q") String q, @Param("role") Role role, Pageable pageable);
}
