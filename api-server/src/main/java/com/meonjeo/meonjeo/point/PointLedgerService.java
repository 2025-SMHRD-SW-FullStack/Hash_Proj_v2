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
        if (amount <= 0) return;
        // 멱등: 동일 (user,reason,ref) 있으면 무시
        if (repo.existsByUserIdAndReasonAndRefKey(userId, reason, refKey)) return;
        PointLedgerEntry e = PointLedgerEntry.builder()
                .userId(userId).amount(-amount).reason(reason).refKey(refKey).build();
        try { repo.save(e); } catch (DataIntegrityViolationException ignore) {/* 동시성 멱등 */}
    }

    @Override
    @Transactional
    public void accrue(Long userId, int amount, String reason, String refKey) {
        if (amount <= 0) return;
        if (repo.existsByUserIdAndReasonAndRefKey(userId, reason, refKey)) return;
        PointLedgerEntry e = PointLedgerEntry.builder()
                .userId(userId).amount(+amount).reason(reason).refKey(refKey).build();
        try { repo.save(e); } catch (DataIntegrityViolationException ignore) {/* 동시성 멱등 */}
    }
}
