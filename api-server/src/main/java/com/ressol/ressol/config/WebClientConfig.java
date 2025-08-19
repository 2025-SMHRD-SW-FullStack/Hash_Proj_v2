package com.ressol.ressol.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.reactive.function.client.WebClient;

@Configuration
public class WebClientConfig {

    // Boot가 WebClient.Builder를 자동 제공(웹플럭스 의존성 필요)하므로 주입받아 사용
    @Bean
    public WebClient webClient(WebClient.Builder builder) {
        return builder.build();
    }
}
