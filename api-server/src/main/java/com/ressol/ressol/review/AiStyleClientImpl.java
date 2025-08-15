package com.ressol.ressol.review;

import com.ressol.ressol.config.ReviewProperties;
import com.ressol.ressol.review.dto.AiStyleAnalyzeRequest;
import com.ressol.ressol.review.dto.AiStyleAnalyzeResponse;
import com.ressol.ressol.review.dto.AiStyleClient;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;

@Component
@RequiredArgsConstructor
public class AiStyleClientImpl implements AiStyleClient {

    private final WebClient webClient;
    private final ReviewProperties props;

    @Override
    public AiStyleAnalyzeResponse analyze(AiStyleAnalyzeRequest req) {
        return webClient.post()
                .uri(props.getAiBaseUrl() + "/api/ai/style/analyze")
                .contentType(MediaType.APPLICATION_JSON)
                .bodyValue(req)
                .retrieve()
                .bodyToMono(AiStyleAnalyzeResponse.class)
                .block();
    }
}