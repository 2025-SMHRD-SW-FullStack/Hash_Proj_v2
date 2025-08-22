package com.meonjeo.meonjeo.point;

public enum RedemptionStatus {
    REQUESTED,    // 사용자 교환 신청 접수 (포인트 즉시 차감)
    FULFILLED,    // 슈퍼관리자가 발송 완료 처리
    REJECTED      // (옵션) 거절 시, 포인트 수동 복원 필요
}
