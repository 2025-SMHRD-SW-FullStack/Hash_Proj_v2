package com.meonjeo.meonjeo.common;
public enum OrderStatus {
    PENDING,   // 결제 전
    PAID,      // 결제 완료
    READY, IN_TRANSIT, DELIVERED, CONFIRMED, EXCHANGE, EXCHANGE_REJECTED
}
