package com.ressol.ressol.point;

public interface PointService {

    /** 슈퍼관리자 충전 (현금 입금 확인 후) */
    void topUpBySuperAdmin(Long adminId, Long merchantId, long amount, String note);

    /** 게시글 생성 수수료 50 차감 (postId 멱등키) */
    void chargePostCreateFee(Long merchantId, Long postId);

    /** 리뷰 승인 지급: 사장→사용자 500 전송 (reviewId 멱등키) */
    void payoutReviewApproved(Long merchantId, Long userId, Long reviewId);

    /** 추천 가입 보상: referrer에게 500 (newUserId 멱등키) */
    void awardReferralSignup(Long referrerId, Long newUserId);

    /** 잔액 조회(캐시 기준) */
    long getBalance(Long userId);

    /** 기프티콘 교환 신청: 5k/10k/30k만 허용, 즉시 차감 후 Redemption 생성 */
    Long redeemGiftCard(Long userId, long amount, String channel, String note);

    /** (선택) 관리자가 교환 완료 처리 */
    void markRedemptionFulfilled(Long redemptionId, Long adminId);
}
