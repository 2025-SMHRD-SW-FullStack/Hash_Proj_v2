package com.ressol.ressol.review;

import com.ressol.ressol.config.AiGateway;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionalEventListener;
import org.springframework.transaction.event.TransactionPhase;
import reactor.core.publisher.Mono;

@Slf4j
@Component
@RequiredArgsConstructor
public class ReviewAiListener {

    private final AiGateway ai;

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onSubmitted(ReviewSubmittedEvent e) {
        ai.ingestStyle(e.userId(), java.util.List.of(e.content()))
                .doOnError(err -> log.warn("AI ingest failed reviewId={} err={}", e.reviewId(), err.toString()))
                .onErrorResume(err -> Mono.empty())
                .subscribe(); // fire-and-forget: 본 요청 흐름과 분리
    }
}