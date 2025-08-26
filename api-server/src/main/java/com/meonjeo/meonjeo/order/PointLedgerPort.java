package com.meonjeo.meonjeo.order;

public interface PointLedgerPort {
    int getBalance(Long userId);
    void spend(Long userId, int amount, String reason, String refKey);
    void accrue(Long userId, int amount, String reason, String refKey);
}
