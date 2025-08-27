package com.meonjeo.meonjeo.exchange;

public enum ExchangeStatus {
    REQUESTED,            // 사용자 신청
    APPROVED,             // 사장 승인(발송 대기)
    REJECTED,             // 사장 반려(사유 기록)
    REPLACEMENT_SHIPPED,  // 교환품 발송
    REPLACEMENT_DELIVERED,// 교환품 배송완료(웹훅/동기화로 갱신)
    CLOSED                // 종료(배송완료 후 자동/수동 종결)
}
