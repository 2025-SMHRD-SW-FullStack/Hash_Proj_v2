package com.ressol.ressol.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;

@Getter @Setter
@ConfigurationProperties(prefix = "ai")
public class AiProperties {
    private String baseUrl;
    private Timeout timeout = new Timeout();

    @Getter @Setter
    public static class Timeout {
        private int connectMs = 1500;
        private int readMs = 3000;
    }
}
