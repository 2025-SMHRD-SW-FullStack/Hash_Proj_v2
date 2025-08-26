package com.meonjeo.meonjeo.ad;

import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@EnableScheduling
@Component
@RequiredArgsConstructor
public class AdBatch {
    private final AdService service;

    // 매일 00:05 - 시작일 도달한 예약 자동 활성화
    @Scheduled(cron = "0 5 0 * * *")
    public void activateToday() { service.activateBookingsStartingToday(); }

    // 매일 00:10 - 종료 지난 광고 자동 완료
    @Scheduled(cron = "0 10 0 * * *")
    public void completeExpired() { service.completeExpiredToday(); }
}
