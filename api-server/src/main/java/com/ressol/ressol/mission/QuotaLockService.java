package com.ressol.ressol.mission;

import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.script.DefaultRedisScript;
import org.springframework.stereotype.Service;

import java.time.*;
import java.util.List;

@Service
@RequiredArgsConstructor
public class QuotaLockService {

    private final StringRedisTemplate redis;

    private static final String ACQUIRE_LUA =
            "local tk = KEYS[1]; local dk = KEYS[2]; " +
                    "local tinit = tonumber(ARGV[1]); local dinit = tonumber(ARGV[2]); local dexp = tonumber(ARGV[3]); " +
                    "if redis.call('EXISTS', tk) == 0 then redis.call('SET', tk, tinit); end " +
                    "if redis.call('EXISTS', dk) == 0 then redis.call('SET', dk, dinit); if dexp > 0 then redis.call('EXPIRE', dk, dexp); end end " +
                    "local tl = tonumber(redis.call('GET', tk)); local dl = tonumber(redis.call('GET', dk)); " +
                    "if tl <= 0 or dl <= 0 then return -1 end " +
                    "redis.call('DECR', tk); redis.call('DECR', dk); return 1";

    private static final String RELEASE_LUA =
            "local tk = KEYS[1]; local dk = KEYS[2]; " +
                    "if redis.call('EXISTS', tk) == 1 then redis.call('INCR', tk); end " +
                    "if redis.call('EXISTS', dk) == 1 then redis.call('INCR', dk); end " +
                    "return 1";

    public boolean tryAcquire(long missionId, int totalInit, int dailyInit){
        String totalKey = "mission:" + missionId + ":total_left";
        ZoneId zone = ZoneId.of("Asia/Seoul");
        ZonedDateTime now = ZonedDateTime.now(zone);
        String ymd = now.format(java.time.format.DateTimeFormatter.BASIC_ISO_DATE); // yyyyMMdd
        String dailyKey = "mission:" + missionId + ":daily:" + ymd;

        long secondsToEndOfDay = Duration.between(now, now.toLocalDate().plusDays(1).atStartOfDay(zone)).toSeconds();

        Long r = redis.execute(new DefaultRedisScript<>(ACQUIRE_LUA, Long.class),
                List.of(totalKey, dailyKey),
                String.valueOf(totalInit), String.valueOf(dailyInit), String.valueOf(secondsToEndOfDay));
        return r != null && r == 1L;
    }

    public void release(long missionId){
        String totalKey = "mission:" + missionId + ":total_left";
        ZoneId zone = ZoneId.of("Asia/Seoul");
        String ymd = ZonedDateTime.now(zone).format(java.time.format.DateTimeFormatter.BASIC_ISO_DATE);
        String dailyKey = "mission:" + missionId + ":daily:" + ymd;
        redis.execute(new DefaultRedisScript<>(RELEASE_LUA, Long.class), List.of(totalKey, dailyKey));
    }
}
