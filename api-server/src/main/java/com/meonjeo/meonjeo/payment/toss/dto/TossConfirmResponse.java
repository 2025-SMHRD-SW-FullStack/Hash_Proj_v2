package com.meonjeo.meonjeo.payment.toss.dto;

public record TossConfirmResponse(
        Long orderDbId, String orderId, String paymentKey, String method, int totalAmount, String approvedAt
) {}