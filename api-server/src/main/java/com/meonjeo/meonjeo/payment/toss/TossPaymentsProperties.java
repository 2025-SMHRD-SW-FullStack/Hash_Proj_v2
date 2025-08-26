package com.meonjeo.meonjeo.payment.toss;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "toss")
public record TossPaymentsProperties(
        String secretKey,   // sk_test_xxx
        String clientKey,   // ck_test_xxx (프론트에서 사용)
        String successUrl,  // (선택) 프론트 리다이렉트 URL
        String failUrl
) {}
