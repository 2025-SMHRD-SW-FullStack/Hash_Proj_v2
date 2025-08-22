package com.meonjeo.meonjeo.config;

import reactor.core.publisher.Mono;

import java.util.List;

public interface AiGateway {
    /** 사용자 스타일 학습(리뷰 제출 직후) */
    Mono<Void> ingestStyle(long userId, List<String> samples);

    /** (선택) 헬스체크 */
    Mono<Boolean> health();
}