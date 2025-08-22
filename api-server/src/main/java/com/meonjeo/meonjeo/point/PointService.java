package com.meonjeo.meonjeo.point;

import com.meonjeo.meonjeo.exception.BadRequestException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Set;

@Service
@RequiredArgsConstructor
public class PointService {

    public enum Reason { REVIEW_APPROVED, MANUAL_CREDIT, REFERRAL_SIGNUP, REDEEM_REQUESTED }

    private final PointAccountRepository accountRepo;
    private final PointLedgerRepository  ledgerRepo;
    private final PointRedemptionRepository redemptionRepo;

    public long reviewUnitPoint()     { return 500L; }
    public long referralSignupPoint() { return 500L; }

    /** 내 잔액 조회 */
    @Transactional(readOnly = true)
    public long getBalance(Long userId){
        return accountRepo.findByUserId(userId).map(PointAccount::getBalance).orElse(0L);
    }

    /** 적립(+)/차감(-) 공통 */
    @Transactional
    public void credit(Long userId, long amount, Reason reason, Long applicationId){
        PointAccount acc = accountRepo.findByUserId(userId)
                .orElse(PointAccount.builder().userId(userId).balance(0L).build());
        acc.setBalance(acc.getBalance() + amount); // amount는 + 또는 - 모두 가능
        if (acc.getBalance() < 0) throw new BadRequestException("INSUFFICIENT_BALANCE");
        accountRepo.save(acc);

        ledgerRepo.save(PointLedger.builder()
                .userId(userId)
                .delta(amount)
                .reason(PointLedger.Reason.valueOf(reason.name()))
                .applicationId(applicationId)
                .build());
    }

    /** 추천가입 보상 (추천인에게 +) */
    @Transactional
    public void awardReferralSignup(Long referrerUserId, Long newUserId){
        if (referrerUserId == null || newUserId == null) return;
        if (referrerUserId.equals(newUserId)) return;
        credit(referrerUserId, referralSignupPoint(), Reason.REFERRAL_SIGNUP, null);
    }

    private static final Set<Long> ALLOWED_REDEEM = Set.of(5_000L, 10_000L, 30_000L);

    /** 기프티콘 등 교환 신청: 즉시 포인트 차감, 신청 레코드 생성 후 ID 반환 */
    @Transactional
    public long redeemGiftCard(Long userId, long amount, String channel, String note){
        if (!ALLOWED_REDEEM.contains(amount)) throw new BadRequestException("INVALID_REDEEM_AMOUNT");
        long current = getBalance(userId);
        if (current < amount) throw new BadRequestException("INSUFFICIENT_BALANCE");

        // 차감(-amount)
        credit(userId, -amount, Reason.REDEEM_REQUESTED, null);

        PointRedemption red = PointRedemption.builder()
                .userId(userId)
                .amount(amount)
                .channel(channel)
                .note(note)
                .status(PointRedemption.Status.REQUESTED)
                .build();
        redemptionRepo.save(red);
        return red.getId();
    }
}
