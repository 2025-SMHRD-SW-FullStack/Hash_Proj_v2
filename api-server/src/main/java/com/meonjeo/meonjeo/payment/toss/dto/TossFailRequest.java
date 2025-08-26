package com.meonjeo.meonjeo.payment.toss.dto;

public record TossFailRequest(String orderId, String message, String code) {}