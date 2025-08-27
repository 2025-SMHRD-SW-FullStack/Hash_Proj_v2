package com.meonjeo.meonjeo.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;

import java.util.ArrayList;
import java.util.List;

@Getter
@Setter
@ConfigurationProperties(prefix = "app.cors")
public class AppCorsProperties {
    /**
     * 허용 도메인(정확한 Origin만; 와일드카드 금지)
     * 예) https://meonjeo.com, https://dev.meonjeo.com, http://localhost:5173
     */
    private List<String> allowedOrigins = new ArrayList<>();

    /** 허용 메서드 */
    private List<String> allowedMethods = List.of("GET","POST","PUT","DELETE","PATCH","OPTIONS");

    /** 허용 헤더 */
    private List<String> allowedHeaders = List.of("*");

    /** 노출 헤더 */
    private List<String> exposedHeaders = List.of("Authorization","Set-Cookie");

    /** 크리덴셜 허용 여부 */
    private boolean allowCredentials = true;
}
