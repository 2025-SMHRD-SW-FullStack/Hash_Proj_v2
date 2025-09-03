package com.meonjeo.meonjeo.feedback;

import com.meonjeo.meonjeo.feedback.dto.*;
import com.meonjeo.meonjeo.security.AuthSupport; // 1. import 추가
import io.swagger.v3.oas.annotations.tags.Tag;
import io.swagger.v3.oas.annotations.Operation;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@Tag(name="피드백")
@RestController
@RequestMapping("/api/feedbacks")
@RequiredArgsConstructor
public class FeedbackController {

    private final FeedbackService service;
    private final FeedbackRepository feedbackRepo; // 2. Repository 추가
    private final AuthSupport auth;               // 3. AuthSupport 추가

    @Operation(summary="피드백 작성(제출 즉시 포인트 지급, 1회 한정)")
    @PostMapping
    public FeedbackResponse create(@RequestBody @Valid FeedbackCreateRequest req) {
        return service.create(req);
    }

    @Operation(summary="피드백 수정 (내용/이미지 만, 마감 전 & 작성자 본인만)")
    @PatchMapping("/{id}")
    public FeedbackResponse update(@PathVariable Long id, @RequestBody FeedbackUpdateRequest req) {
        return service.update(id, req);
    }

    // 이 메서드는 이제 정상 작동합니다.
    @Operation(summary="주문 아이템에 대한 피드백 작성 여부 확인")
    @GetMapping("/order-item/{orderItemId}/done")
    public ResponseEntity<Map<String, Boolean>> isFeedbackDone(@PathVariable Long orderItemId) {
        Long userId = auth.currentUserId();
        boolean isDone = feedbackRepo.existsByOrderItemIdAndUserId(orderItemId, userId);
        return ResponseEntity.ok(Map.of("done", isDone));
    }

    @Operation(summary="내 피드백 목록 (페이지네이션)")
    @GetMapping("/me")
    public Page<FeedbackResponse> myFeedbacks(Pageable pageable) {
        return service.listMyFeedbacks(pageable);
    }

    @Operation(summary="내 피드백 상세 조회")
    @GetMapping("/{id}")
    public FeedbackResponse myFeedbackDetail(@PathVariable Long id) {
        return service.findByIdForUser(id);
    }

    @Operation(summary="상품 피드백 목록 (페이지네이션)")
    @GetMapping("/products/{productId}")
    public Page<FeedbackResponse> productFeedbacks(@PathVariable Long productId, Pageable pageable) {
        return service.listByProduct(productId, pageable);
    }

    @GetMapping("/product/{productId}/done")
    public Map<String, Boolean> doneForProduct(@PathVariable Long productId) {
        Long uid = auth.currentUserId();
        boolean done = feedbackRepo.existsForUserAndProduct(uid, productId);
        return Map.of("done", done);
    }

    @GetMapping("/eligibility")
    public Map<String, Object> eligibility(@RequestParam Long orderItemId) {
        // FeedbackService.create()와 동일 조건 평가 후
        // ok / reason 리턴
        return Map.of("ok", true);
    }
}