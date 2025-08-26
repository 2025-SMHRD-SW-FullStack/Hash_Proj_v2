package com.meonjeo.meonjeo.payment.toss.dto;

public record TossConfirmResponse(
        String orderId, String paymentKey, String method, int totalAmount, String approvedAt
) {}