package com.meonjeo.meonjeo.healthz;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
public class HealthController {

    // GET /healthz → {"ok": true}
    @GetMapping("/healthz")
    public Map<String, Object> healthz() {
        return Map.of("ok", true);
    }
}
