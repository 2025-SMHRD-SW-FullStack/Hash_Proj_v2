package com.meonjeo.meonjeo.payment.toss;

import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.*;
import org.springframework.http.HttpHeaders;
import org.springframework.web.reactive.function.client.WebClient;
import java.nio.charset.StandardCharsets;
import java.util.Base64;

@Configuration
@EnableConfigurationProperties(TossPaymentsProperties.class)
public class TossPaymentsConfig {

    @Bean
    WebClient tossWebClient(TossPaymentsProperties prop){
        String basic = Base64.getEncoder().encodeToString((prop.secretKey() + ":").getBytes(StandardCharsets.UTF_8));
        return WebClient.builder()
                .baseUrl("https://api.tosspayments.com")
                .defaultHeader(HttpHeaders.AUTHORIZATION, "Basic " + basic)
                .defaultHeader(HttpHeaders.CONTENT_TYPE, "application/json")
                .build();
    }
}
