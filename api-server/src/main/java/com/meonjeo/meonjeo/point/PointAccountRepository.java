package com.meonjeo.meonjeo.point;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface PointAccountRepository extends JpaRepository<PointAccount, Long> {
    Optional<PointAccount> findByUserId(Long userId);
}
