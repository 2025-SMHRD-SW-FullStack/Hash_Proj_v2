package com.ressol.ressol.phone;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;

import java.time.Duration;

@Component
@RequiredArgsConstructor
public class SmsGuard {
    private final StringRedisTemplate redis;

    @Value("${spring.security.sms.cooldown-seconds:60}")
    private long cooldownSec;
    @Value("${spring.security.sms.window10m-max:3}")
    private int max10m;
    @Value("${spring.security.sms.window24h-max:10}")
    private int max24h;
    @Value("${spring.security.sms.verify-max-attempts-hour:5}")
    private int maxVerifyPerHour;
    @Value("${spring.security.sms.lock-minutes:15}")
    private long lockMin;

    private String kCd(String p)   { return "sms:cooldown:" + p; }
    private String k10(String p)   { return "sms:cnt10m:" + p; }
    private String k24(String p)   { return "sms:cnt24h:" + p; }
    private String kTry(String p)  { return "sms:attempts1h:" + p; }
    private String kLock(String p) { return "sms:lock:" + p; }

    public void ensureCanSend(String phoneE164) {
        if (exists(kLock(phoneE164))) throw new IllegalStateException("LOCKED");
        if (exists(kCd(phoneE164)))   throw new IllegalStateException("COOLDOWN");

        long c10 = incrWithTtl(k10(phoneE164), Duration.ofMinutes(10));
        if (c10 > max10m) throw new IllegalStateException("LIMIT_10M");
        long c24 = incrWithTtl(k24(phoneE164), Duration.ofHours(24));
        if (c24 > max24h) throw new IllegalStateException("LIMIT_24H");

        redis.opsForValue().set(kCd(phoneE164), "1", Duration.ofSeconds(cooldownSec));
    }

    public void onVerifyFail(String phoneE164) {
        long cnt = incrWithTtl(kTry(phoneE164), Duration.ofHours(1));
        if (cnt >= maxVerifyPerHour) {
            redis.opsForValue().set(kLock(phoneE164), "1", Duration.ofMinutes(lockMin));
        }
    }

    public void onVerifySuccess(String phoneE164) {
        redis.delete(kTry(phoneE164));
        redis.delete(kLock(phoneE164));
    }

    private boolean exists(String key) { Boolean b = redis.hasKey(key); return b != null && b; }
    private long incrWithTtl(String key, Duration ttl) {
        Long v = redis.opsForValue().increment(key);
        if (v != null && v == 1L) redis.expire(key, ttl);
        return v == null ? 0 : v;
    }
}
