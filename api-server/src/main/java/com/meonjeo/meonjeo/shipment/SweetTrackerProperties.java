package com.meonjeo.meonjeo.shipment;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Data @Component
@ConfigurationProperties("sweettracker")
public class SweetTrackerProperties {
    private String apiKey;
    private String baseUrl = "https://info.sweettracker.co.kr";
    private int timeoutMs = 3000;
}
