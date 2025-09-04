package com.meonjeo.meonjeo.survey;

import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/surveys")
@RequiredArgsConstructor
public class SurveySubmissionController {
    private final SurveySubmissionService svc;

    @PostMapping("/answers")
    public Map<String, Object> submit(@RequestBody Map<String,Object> body) {
        Long orderItemId = Long.valueOf(String.valueOf(body.get("orderItemId")));
        Long productId   = Long.valueOf(String.valueOf(body.get("productId")));
        Integer score    = body.get("overallScore") == null ? null : Integer.valueOf(String.valueOf(body.get("overallScore")));
        Object answers   = body.get("answers");

        var saved = svc.save(orderItemId, productId, score, answers);
        return Map.of("ok", true, "id", saved.getId());
    }
}
