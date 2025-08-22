package com.meonjeo.meonjeo.config;

import io.netty.channel.ChannelOption;
import io.netty.handler.timeout.ReadTimeoutHandler;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.reactive.ReactorClientHttpConnector;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.netty.http.client.HttpClient;

import java.time.Duration;
import java.util.concurrent.TimeUnit;

@Configuration
@EnableConfigurationProperties(AiProperties.class)
@RequiredArgsConstructor
public class AiConfig {

    private final AiProperties props;

    @Bean(name = "aiWebClient")
    public WebClient aiWebClient(WebClient.Builder builder) {
        var t = props.getTimeout();
        HttpClient http = HttpClient.create()
                .option(ChannelOption.CONNECT_TIMEOUT_MILLIS, t.getConnectMs())
                .responseTimeout(Duration.ofMillis(t.getReadMs()))
                .doOnConnected(conn ->
                        conn.addHandlerLast(new ReadTimeoutHandler(t.getReadMs(), TimeUnit.MILLISECONDS))
                );

        return builder
                .baseUrl(props.getBaseUrl().replaceAll("/+$", ""))
                .clientConnector(new ReactorClientHttpConnector(http))
                .build();
    }

    @SuppressWarnings("SpringJavaInjectionPointsAutowiringInspection") // (선택) 메서드 수준
    @Bean
    public AiGateway aiGateway(@Qualifier("aiWebClient") WebClient wc) {
        return new HttpAiGateway(wc);
    }
}