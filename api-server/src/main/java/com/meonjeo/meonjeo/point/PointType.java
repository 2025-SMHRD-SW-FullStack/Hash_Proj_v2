package com.meonjeo.meonjeo.point;

public enum PointType {
    TOPUP_ADMIN,          // 슈퍼관리자 충전
    POST_CREATE_FEE,      // 게시글 생성 수수료 (50)
    REVIEW_PAYOUT,        // 리뷰 승인 지급(사장→사용자 500) : 양쪽 계정에 각각 기록
    REFERRAL_SIGNUP,      // 추천 가입 보상(500)
    REDEMPTION_GIFTCARD   // 기프티콘 교환(음수 차감)
}
