package com.meonjeo.meonjeo.point;

import com.meonjeo.meonjeo.point.dto.*;
import com.meonjeo.meonjeo.security.AuthSupport;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class PointRedemptionService {

    private final PointRedemptionRepository redemptionRepo;
    private final PointLedgerRepository ledgerRepo;
    private final PointLedgerService ledgerService; // PointLedgerPort 구현체
    private final AuthSupport auth;

    // 포인트 교환 가능 단위(시연용): 5천/1만/3만
    private static final Set<Integer> ALLOWED = Set.of(5_000, 10_000, 30_000);

    private Long currentUserId(){ return auth.currentUserId(); }

    @Transactional
    public RedemptionResponse request(int amount) {
        if (!ALLOWED.contains(amount)) throw new IllegalArgumentException("교환 가능 금액: 5,000/10,000/30,000");

        Long uid = currentUserId();
        int balance = ledgerRepo.sumBalance(uid);
        if (balance < amount) throw new IllegalStateException("포인트 잔액 부족");

        var r = redemptionRepo.save(PointRedemption.builder()
                .userId(uid).amount(amount).status(RedemptionStatus.REQUESTED).build());

        // 잔액 락(차감) — 승인 되면 유지, 반려되면 되돌림(+)
        ledgerService.spend(uid, amount, "REDEEM_LOCK", "redeem:"+r.getId());

        return new RedemptionResponse(r.getId(), r.getAmount(), r.getStatus(), r.getCreatedAt(), r.getProcessedAt());
    }

    @Transactional
    public RedemptionResponse approve(Long redemptionId) {
        var r = redemptionRepo.findById(redemptionId).orElseThrow();
        if (r.getStatus() != RedemptionStatus.REQUESTED) return toDto(r);
        r.setStatus(RedemptionStatus.APPROVED);
        r.setProcessedAt(LocalDateTime.now());
        return toDto(r);
    }

    @Transactional
    public RedemptionResponse reject(Long redemptionId) {
        var r = redemptionRepo.findById(redemptionId).orElseThrow();
        if (r.getStatus() != RedemptionStatus.REQUESTED) return toDto(r);
        r.setStatus(RedemptionStatus.REJECTED);
        r.setProcessedAt(LocalDateTime.now());
        ledgerService.accrue(r.getUserId(), r.getAmount(), "REDEEM_CANCEL", "redeem:"+r.getId());
        return toDto(r);
    }

    public static RedemptionResponse toDto(PointRedemption r){
        return new RedemptionResponse(r.getId(), r.getAmount(), r.getStatus(), r.getCreatedAt(), r.getProcessedAt());
    }
}
