package com.meonjeo.meonjeo.analytics;

import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.ZoneId;
import java.util.*;

@RestController
@RequestMapping("/api/seller/ai/daily")
@RequiredArgsConstructor
public class SellerAnalyticsController {

    private final AiDailySummaryService svc;

    @GetMapping
    public Map<String, Object> list(
            @RequestParam Long productId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(required = false, defaultValue = "14") Integer limit,
            @RequestParam(required = false, defaultValue = "true") boolean autocreate
    ) {
        // ✅ 어제 요약 자동 보장(최초 호출에도 빈 화면 방지)
        if (autocreate) {
            LocalDate yesterday = LocalDate.now(ZoneId.of("Asia/Seoul")).minusDays(1);
            svc.generateIfAbsent(productId, yesterday);
        }

        var arr = svc.list(productId, from, to, limit);
        var last = svc.lastGeneratedAt(productId);

        List<Map<String, Object>> days = new ArrayList<>();
        for (var r : arr) {
            days.add(Map.of(
                    "date", r.getSummaryDate().toString(),
                    "headline", Objects.toString(r.getHeadlineMd(),""),
                    "keyPointsJson", r.getKeyPointsJson(),
                    "actionsJson",  r.getActionsJson(),
                    "fullSummary",  Objects.toString(r.getFullSummaryMd(),""),
                    "model", Objects.toString(r.getModel(),""),
                    "createdAt", r.getCreatedAt().toString()
            ));
        }
        return Map.of(
                "days", days,
                "lastGeneratedAt", last != null ? last.toString() : null
        );
    }

    @PostMapping("/generate")
    public Map<String, Object> generate(@RequestBody Map<String, String> body) {
        Long productId = Long.valueOf(Objects.requireNonNull(body.get("productId"), "productId required"));
        LocalDate date = LocalDate.parse(Objects.requireNonNull(body.get("date"), "date(YYYY-MM-DD) required"));
        var out = svc.generateIfAbsent(productId, date);
        return Map.of("ok", true, "date", date.toString(), "id", out.getId());
    }
}
