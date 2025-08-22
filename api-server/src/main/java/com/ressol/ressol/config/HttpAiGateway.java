package com.ressol.ressol.config;

import lombok.RequiredArgsConstructor;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

import java.util.List;
import java.util.Map;

@RequiredArgsConstructor
class HttpAiGateway implements AiGateway {

    private final WebClient wc;

    @Override
    public Mono<Void> ingestStyle(long userId, List<String> samples) {
        if (samples == null || samples.isEmpty()) return Mono.empty();
        return wc.post()
                .uri("/ai/style/ingest")
                // 현재 ai-server는 Bearer <userId> 모킹 방식
                .header("Authorization", "Bearer " + userId)
                .bodyValue(Map.of("samples", samples))
                .retrieve()
                .toBodilessEntity()
                .then();
    }

    @Override
    public Mono<Boolean> health() {
        return wc.get()
                .uri("/health")
                .retrieve()
                .toBodilessEntity()
                .map(r -> true)
                .onErrorReturn(false);
    }
}