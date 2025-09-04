package com.meonjeo.meonjeo.analytics;

import com.meonjeo.meonjeo.analytics.dto.ProductSnapshotResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/analytics")
@RequiredArgsConstructor
public class AnalyticsController {

    private final RealtimeStatsService realtime;

    @GetMapping("/products/{productId}/snapshot")
    public ProductSnapshotResponse snapshot(@PathVariable Long productId) {
        return realtime.snapshot(productId);
    }

    @PostMapping("/products/{productId}/ai-summary")
    public Map<String, Object> aiSummary(@PathVariable Long productId) {
        return realtime.realtimeSummary(productId);
    }
}
