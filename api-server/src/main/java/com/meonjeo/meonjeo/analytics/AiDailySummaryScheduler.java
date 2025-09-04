package com.meonjeo.meonjeo.analytics;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.annotation.Scheduled;

import java.time.LocalDate;
import java.time.ZoneId;

@Configuration
@EnableScheduling
@RequiredArgsConstructor
@Slf4j
public class AiDailySummaryScheduler {

    private final AiDailySummaryService svc;
    private final com.meonjeo.meonjeo.product.ProductRepository productRepo;

    // 매일 03:05 KST 전날 요약 생성
    @Scheduled(cron = "0 5 3 * * *", zone = "Asia/Seoul")
    public void generateForYesterday() {
        LocalDate day = LocalDate.now(ZoneId.of("Asia/Seoul")).minusDays(1);
        productRepo.findAll().forEach(p -> {
            try {
                svc.generateIfAbsent(p.getId(), day);
            } catch (Exception e) {
                log.warn("AI 요약 생성 실패: productId={} day={} err={}", p.getId(), day, e.toString());
            }
        });
    }
}
