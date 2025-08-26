package com.meonjeo.meonjeo.phone;

import com.meonjeo.meonjeo.sms.SmsProvider;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.concurrent.ThreadLocalRandom;

@Service
@RequiredArgsConstructor
public class VerifyPhoneAuthService implements PhoneAuthService {

    private final PhoneShortTokenProvider shortTokenProvider;
    private final SmsGuard guard;
    private final StringRedisTemplate redis;
    private final SmsProvider smsProvider;

    @Value("${phone.code.ttl-seconds:180}") // dev yml에서 관리
    private long codeTtlSeconds;

    private String codeKey(String phoneE164) { return "sms:code:" + phoneE164; }

    @Override
    public void sendCode(String phoneRaw) {
        String to = PhoneFmt.toE164Kr(phoneRaw);
        guard.ensureCanSend(to);

        String code = String.format("%06d", ThreadLocalRandom.current().nextInt(0, 1_000_000));
        redis.opsForValue().set(codeKey(to), code, Duration.ofSeconds(codeTtlSeconds));

        long min = Math.max(1, codeTtlSeconds / 60);
        smsProvider.send(to, "[먼저써봄] 본인인증번호: " + code + " (유효 " + min + "분)");
    }

    @Override
    public String verifyCodeAndIssueToken(String phoneRaw, String code) {
        String to = PhoneFmt.toE164Kr(phoneRaw);
        String saved = redis.opsForValue().get(codeKey(to));
        if (saved == null || !saved.equals(code)) {
            guard.onVerifyFail(to);
            throw new IllegalArgumentException("CODE_INVALID");
        }
        redis.delete(codeKey(to));
        guard.onVerifySuccess(to);
        return shortTokenProvider.issue(to);
    }

    @Override
    public boolean validateShortToken(String phoneRaw, String shortToken) {
        return shortTokenProvider.validate(PhoneFmt.toE164Kr(phoneRaw), shortToken);
    }
}
