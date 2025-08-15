package com.ressol.ressol.review;

import com.ressol.ressol.exception.ReviewException;
import com.ressol.ressol.config.ReviewProperties;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class ReviewPolicyService {

    private final ReviewProperties props;

    public int resolveCharLimit(Integer desired){
        int max = Optional.ofNullable(props.getMaxChars()).orElse(1200);
        int base = 800; // 기본 제안치
        int want = (desired == null ? base : Math.max(100, desired));
        return Math.min(max, want);
    }

    public int resolveCharLimitForPlatform(String platform, Integer desired) {
        // application.yml 의 review.platform-char-limit.* 값을 우선 사용(없으면 기본 로직)
        try {
            var map = props.getPlatformCharLimit(); // Map<String,Integer>
            if (map != null && platform != null) {
                Integer plaf = map.get(platform);
                if (plaf != null) {
                    int want = (desired == null ? plaf : Math.min(plaf, Math.max(100, desired)));
                    int max  = Optional.ofNullable(props.getMaxChars()).orElse(1200);
                    return Math.min(max, want);
                }
            }
        } catch (Exception ignore) {}
        return resolveCharLimit(desired);
    }


    public void ensureCanRegenerate(Review review){
        int max = Optional.ofNullable(props.getMaxRegens()).orElse(3);
        if (review.getRegenCount() != null && review.getRegenCount() >= max) {
            throw ReviewException.invalidState("재생성 한도(" + max + ")를 초과했습니다.");
        }
    }

    public int calcPointCost(Integer regenCount){
        int free = Optional.ofNullable(props.getFreeRegens()).orElse(1);
        if (regenCount == null || regenCount < free) return 0;
        return Optional.ofNullable(props.getRegenPointCost()).orElse(50);
    }

    public boolean shouldSnapshot(LocalDateTime lastSnapshotAt, LocalDateTime now){
        int sec = Optional.ofNullable(props.getSnapshotIntervalSec()).orElse(30);
        return lastSnapshotAt == null || Duration.between(lastSnapshotAt, now).getSeconds() >= sec;
    }

    public int snapshotKeepMax(){
        return Optional.ofNullable(props.getSnapshotKeepMax()).orElse(20);
    }
}
