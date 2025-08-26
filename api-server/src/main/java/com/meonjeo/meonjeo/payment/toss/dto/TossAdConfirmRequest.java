package com.meonjeo.meonjeo.payment.toss.dto;

public record TossAdConfirmRequest(String paymentKey, String orderId, int amount, Long bookingId) {}
