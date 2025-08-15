package com.ressol.ressol.review;

import com.ressol.ressol.review.dto.AiReviewRegenerateRequest;
import com.ressol.ressol.review.dto.AiReviewRequest;
import com.ressol.ressol.review.dto.AiReviewResponse;

public interface AiReviewClient {
    AiReviewResponse generate(AiReviewRequest req);
    // 필요 시 재생성 프로토콜을 분리하고 싶으면 아래를 사용:
    // AiReviewResponse regenerate(AiReviewRegenerateRequest req);
}
