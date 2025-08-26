package com.meonjeo.meonjeo.payment.toss.dto;

public record TossAdConfirmResponse(Long bookingId, String paymentKey, int amount, String approvedAt) {}
