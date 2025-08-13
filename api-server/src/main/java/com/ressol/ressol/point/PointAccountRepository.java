package com.ressol.ressol.point;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

public interface PointAccountRepository extends JpaRepository<PointAccount, Long> {

    /** 잔액 증가 (원자적) */
    @Modifying
    @Query("update PointAccount a set a.balance = a.balance + :delta where a.userId = :userId")
    int addBalance(Long userId, long delta);

    /** 조건부 차감 (balance >= amount 일 때만) */
    @Modifying
    @Query("update PointAccount a set a.balance = a.balance - :amount " +
            "where a.userId = :userId and a.balance >= :amount")
    int tryDebit(Long userId, long amount);
}
