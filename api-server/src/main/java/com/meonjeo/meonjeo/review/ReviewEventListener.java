package com.meonjeo.meonjeo.review;

import com.meonjeo.meonjeo.config.AiClient;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionalEventListener;
import org.springframework.transaction.event.TransactionPhase;

@Slf4j
@Component
@RequiredArgsConstructor
public class ReviewEventListener {
    private final AiClient ai;

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onReviewSubmitted(ReviewSubmittedEvent e) {
        ai.ingestStyle(e.userId(), e.content())
                .doOnError(err -> log.warn("AI ingest failed for reviewId={}: {}", e.reviewId(), err.toString()))
                .subscribe(); // fire-and-forget (본 트랜잭션 흐름에 영향 없음)
    }
}