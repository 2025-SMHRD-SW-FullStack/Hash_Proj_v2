package com.ressol.ressol.point;

import com.ressol.ressol.exception.InsufficientPointBalanceException;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class PointServiceImpl implements PointService {

    private final PointLedgerRepository ledgerRepo;
    private final PointAccountRepository accountRepo;
    private final RedemptionRepository redemptionRepo;

    // ========= 공통 유틸 =========

    private void ensureAccountExists(Long userId) {
        if (!accountRepo.existsById(userId)) {
            accountRepo.save(PointAccount.builder().userId(userId).balance(0).build());
        }
    }

    private void credit(Long userId, long amount, PointType type, Long relatedId, String memo) {
        if (amount <= 0) throw new IllegalArgumentException("credit amount must be > 0");
        // 멱등 체크
        if (relatedId != null && ledgerRepo.findByUserIdAndTypeAndRelatedId(userId, type, relatedId).isPresent()) return;

        // 원장 기록
        ledgerRepo.save(PointLedger.builder()
                .userId(userId).amount(amount).type(type).status(PointStatus.APPROVED)
                .relatedId(relatedId).memo(memo).build());

        // 잔액 증가(원자적)
        int updated = accountRepo.addBalance(userId, amount);
        if (updated == 0) {
            ensureAccountExists(userId);
            accountRepo.addBalance(userId, amount);
        }
    }

    private void debit(Long userId, long amount, PointType type, Long relatedId, String memo) {
        if (amount <= 0) throw new IllegalArgumentException("debit amount must be > 0");
        // 멱등 체크
        if (relatedId != null && ledgerRepo.findByUserIdAndTypeAndRelatedId(userId, type, relatedId).isPresent()) return;

        // 원장 기록 선 저장 (트랜잭션 롤백으로 일관성 유지)
        ledgerRepo.save(PointLedger.builder()
                .userId(userId).amount(-amount).type(type).status(PointStatus.APPROVED)
                .relatedId(relatedId).memo(memo).build());

        ensureAccountExists(userId);
        int ok = accountRepo.tryDebit(userId, amount);
        if (ok == 0) {
            // 잔액 부족 → 롤백 유도
            throw new InsufficientPointBalanceException("잔액 부족");
        }
    }

    /** 사장→사용자 이체(500 등): 양쪽 멱등, 부족 시 전체 롤백 */
    private void transfer(Long fromUserId, Long toUserId, long amount, PointType type, Long relatedId, String memo) {
        if (amount <= 0) throw new IllegalArgumentException("transfer amount must be > 0");

        // 이미 한쪽이라도 처리돼 있으면 '완료된 것으로 간주' (이벤트 멱등)
        boolean fromDone = relatedId != null &&
                ledgerRepo.findByUserIdAndTypeAndRelatedId(fromUserId, type, relatedId).isPresent();
        boolean toDone = relatedId != null &&
                ledgerRepo.findByUserIdAndTypeAndRelatedId(toUserId, type, relatedId).isPresent();
        if (fromDone && toDone) return;

        // 1) 양쪽 원장 먼저 기록 (트랜잭션 내에서만 실제 반영)
        ledgerRepo.save(PointLedger.builder()
                .userId(fromUserId).amount(-amount).type(type).status(PointStatus.APPROVED)
                .relatedId(relatedId).memo(memo).build());

        ledgerRepo.save(PointLedger.builder()
                .userId(toUserId).amount(amount).type(type).status(PointStatus.APPROVED)
                .relatedId(relatedId).memo(memo).build());

        // 2) 차감(조건부) → 실패 시 예외로 전체 롤백
        ensureAccountExists(fromUserId);
        int ok = accountRepo.tryDebit(fromUserId, amount);
        if (ok == 0) throw new InsufficientPointBalanceException("사장 잔액 부족");

        // 3) 적립
        int updated = accountRepo.addBalance(toUserId, amount);
        if (updated == 0) {
            ensureAccountExists(toUserId);
            accountRepo.addBalance(toUserId, amount);
        }
    }

    // ========= 비즈니스 =========

    @Override
    @Transactional
    public void topUpBySuperAdmin(Long adminId, Long merchantId, long amount, String note) {
        if (amount <= 0) throw new IllegalArgumentException("amount must be > 0");
        credit(merchantId, amount, PointType.TOPUP_ADMIN, /*relatedId*/ null, safeNote(note, "ADMIN:" + adminId));
    }

    @Override
    @Transactional
    public void chargePostCreateFee(Long merchantId, Long postId) {
        debit(merchantId, 50, PointType.POST_CREATE_FEE, postId, "post create fee");
    }

    @Override
    @Transactional
    public void payoutReviewApproved(Long merchantId, Long userId, Long reviewId) {
        transfer(merchantId, userId, 500, PointType.REVIEW_PAYOUT, reviewId, "review approved");
    }

    @Override
    @Transactional
    public void awardReferralSignup(Long referrerId, Long newUserId) {
        credit(referrerId, 500, PointType.REFERRAL_SIGNUP, newUserId, "referral signup");
    }

    @Override
    @Transactional(readOnly = true)
    public long getBalance(Long userId) {
        return accountRepo.findById(userId).map(PointAccount::getBalance).orElse(0L);
    }

    @Override
    @Transactional
    public Long redeemGiftCard(Long userId, long amount, String channel, String note) {
        // 허용 금액만
        if (!(amount == 5000 || amount == 10000 || amount == 30000)) {
            throw new IllegalArgumentException("허용되지 않은 교환 금액");
        }

        // 교환 레코드 생성(요청)
        Redemption r = redemptionRepo.save(Redemption.builder()
                .userId(userId)
                .amount(amount)
                .status(RedemptionStatus.REQUESTED)
                .channel(channel)
                .note(note)
                .build());

        // 즉시 차감 (멱등키=redemptionId)
        try {
            debit(userId, amount, PointType.REDEMPTION_GIFTCARD, r.getId(), "giftcard redeem");
        } catch (InsufficientPointBalanceException e) {
            // 잔액 부족 시 생성 취소
            throw e;
        } catch (DataIntegrityViolationException e) {
            // 중복 신청이면 무시(이미 처리됨)
        }
        return r.getId();
    }

    @Override
    @Transactional
    public void markRedemptionFulfilled(Long redemptionId, Long adminId) {
        Redemption r = redemptionRepo.findById(redemptionId).orElseThrow();
        r.setStatus(RedemptionStatus.FULFILLED);
        r.setFulfilledAt(java.time.LocalDateTime.now());
        r.setFulfilledBy(adminId);
        redemptionRepo.save(r);
    }

    private String safeNote(String note, String fallback) {
        if (note == null || note.isBlank()) return fallback;
        return note.length() > 180 ? note.substring(0, 180) : note;
    }
}
