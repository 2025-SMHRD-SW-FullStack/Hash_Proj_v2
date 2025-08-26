package com.meonjeo.meonjeo.point;

import com.meonjeo.meonjeo.order.PointLedgerPort;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class PointLedgerService implements PointLedgerPort {
    private final PointLedgerRepository repo;

    @Override
    @Transactional(readOnly = true)
    public int getBalance(Long userId) {
        return repo.sumBalance(userId);
    }

    @Override
    @Transactional
    public void spend(Long userId, int amount, String reason, String refKey) {
        if (amount <= 0) throw new IllegalArgumentException("spend amount must be > 0");
        // 잔액 확인
        int balance = repo.sumBalance(userId);
        if (balance < amount) throw new IllegalStateException("포인트 잔액 부족");

        // 중복 방지
        if (repo.existsByUserIdAndReasonAndRefKey(userId, reason, refKey)) return;

        try {
            repo.save(PointLedgerEntry.builder()
                    .userId(userId).amount(-amount)
                    .reason(reason).refKey(refKey).build());
        } catch (DataIntegrityViolationException ignore) {
            // uk_point_ref 중복은 무시(idempotent)
        }
    }

    @Override
    @Transactional
    public void accrue(Long userId, int amount, String reason, String refKey) {
        if (amount <= 0) return; // 0 또는 음수면 무시
        if (repo.existsByUserIdAndReasonAndRefKey(userId, reason, refKey)) return;

        try {
            repo.save(PointLedgerEntry.builder()
                    .userId(userId).amount(amount)
                    .reason(reason).refKey(refKey).build());
        } catch (DataIntegrityViolationException ignore) {
            // uk_point_ref 중복은 무시(idempotent)
        }
    }
}
