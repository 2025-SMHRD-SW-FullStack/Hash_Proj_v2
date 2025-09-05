package com.meonjeo.meonjeo.ai;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

import java.util.Map;

@Component
@RequiredArgsConstructor
public class AiSummaryClient {

    private final RestTemplate rest = new RestTemplate();

    @Value("${ai.server.base:http://http://localhost:8000}")
    private String aiBase;

    public Map<String, Object> realtime(Map<String, Object> payload) {
        String url = aiBase.replaceAll("/+$", "") + "/api/ai/summary/realtime";
        HttpHeaders h = new HttpHeaders();
        h.setContentType(MediaType.APPLICATION_JSON);
        ResponseEntity<Map> resp = rest.exchange(url, HttpMethod.POST, new HttpEntity<>(payload, h), Map.class);
        if (!resp.getStatusCode().is2xxSuccessful() || resp.getBody() == null) {
            throw new IllegalStateException("AI realtime summary failed: " + resp.getStatusCode());
        }
        return resp.getBody();
    }
}
