package com.ressol.ressol.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import lombok.Getter;
import lombok.Setter;

import java.util.Map;

/**
 * application.yml 의 review.* 값을 바인딩합니다.
 */
@Getter
@Setter
@ConfigurationProperties(prefix = "review")
public class ReviewProperties {

    /** http://localhost:8000 처럼 AI 서버 기본 URL */
    private String aiBaseUrl;

    /** 재생성 최대 횟수 */
    private Integer maxRegens;

    /** 무료 재생성 횟수 */
    private Integer freeRegens;

    /** 최대 글자수 상한 */
    private Integer maxChars;

    /** 무료 초과 재생성 1회당 포인트 비용 */
    private Integer regenPointCost;

    /** 스냅샷 최소 간격(초) */
    private Integer snapshotIntervalSec;

    /** 스냅샷 보관 최대 개수 */
    private Integer snapshotKeepMax;

    /**
     * 플랫폼별 기본 글자수 (예: NAVER_STORE:700, COUPANG:400)
     * yml 키: review.platform-char-limit
     */
    private Map<String, Integer> platformCharLimit;
}
