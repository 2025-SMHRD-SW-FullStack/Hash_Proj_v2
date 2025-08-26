package com.meonjeo.meonjeo.payment.toss.dto;

public record TossConfirmRequest(String paymentKey, String orderId, int amount) {}