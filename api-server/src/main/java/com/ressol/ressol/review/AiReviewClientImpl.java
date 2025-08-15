package com.ressol.ressol.review;

import com.ressol.ressol.config.ReviewProperties;
import com.ressol.ressol.review.dto.AiReviewRequest;
import com.ressol.ressol.review.dto.AiReviewResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;

@Component
@RequiredArgsConstructor
public class AiReviewClientImpl implements AiReviewClient {

    private final WebClient webClient;
    private final ReviewProperties props;

    @Override
    public AiReviewResponse generate(AiReviewRequest req) {
        return webClient.post()
                .uri(props.getAiBaseUrl() + "/api/review/generate")
                .contentType(MediaType.APPLICATION_JSON)
                .bodyValue(req)
                .retrieve()
                .bodyToMono(AiReviewResponse.class)
                .block();
    }
}
