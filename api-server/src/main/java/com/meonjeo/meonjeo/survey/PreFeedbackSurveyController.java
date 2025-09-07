package com.meonjeo.meonjeo.survey;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/pre-feedback-surveys")
public class PreFeedbackSurveyController {

    private final PreFeedbackSurveyRepository repo;

    /**
     * 주문항목 기준 프리설문 조회.
     * feedback.scores_json 이 비어있는(예: "{}") AI 게시건을 디테일에서 보이게 하기 위한 폴백 용도.
     *
     * 응답 형식:
     * { orderItemId, productId, overallScore, answersJson }
     * 없으면 디폴트:
     * { orderItemId, productId: null, overallScore: 0, answersJson: "{}" }
     */
    @GetMapping("/by-order-item/{orderItemId}")
    public ResponseEntity<?> byOrderItem(@PathVariable Long orderItemId) {
        return repo.findByOrderItemId(orderItemId)
                .map(pre -> ResponseEntity.ok(Map.of(
                        "orderItemId", pre.getOrderItemId(),
                        "productId", pre.getProductId(),
                        "overallScore", pre.getOverallScore() == null ? 0 : pre.getOverallScore(),
                        "answersJson", pre.getAnswersJson() == null ? "{}" : pre.getAnswersJson()
                )))
                .orElseGet(() -> ResponseEntity.ok(Map.of(
                        "orderItemId", orderItemId,
                        "productId", null,
                        "overallScore", 0,
                        "answersJson", "{}"
                )));
    }
}
