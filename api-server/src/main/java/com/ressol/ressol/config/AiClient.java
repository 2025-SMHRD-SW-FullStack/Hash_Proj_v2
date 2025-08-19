package com.ressol.ressol.config;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

import java.util.List;
import java.util.Map;

@Component
@RequiredArgsConstructor
public class AiClient {
    private final WebClient webClient;
    private final AiProperties props;

    public Mono<Void> ingestStyle(long userId, String content) {
        if (content == null || content.isBlank()) return Mono.empty();
        String url = props.getBaseUrl().replaceAll("/+$","") + "/ai/style/ingest";
        return webClient.post()
                .uri(url)
                .header("Authorization", "Bearer " + userId) // ai-server는 Bearer <userId> 모킹
                .bodyValue(Map.of("samples", List.of(content)))
                .retrieve()
                .toBodilessEntity()
                .then();
    }
}