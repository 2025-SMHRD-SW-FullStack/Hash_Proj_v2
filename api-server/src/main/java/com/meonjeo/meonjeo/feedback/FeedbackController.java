package com.meonjeo.meonjeo.feedback;

import com.meonjeo.meonjeo.feedback.dto.*;
import io.swagger.v3.oas.annotations.tags.Tag;
import io.swagger.v3.oas.annotations.Operation;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.web.bind.annotation.*;

@Tag(name="피드백")
@RestController @RequestMapping("/api/feedbacks")
@RequiredArgsConstructor
public class FeedbackController {
    private final FeedbackService service;

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

    @Operation(summary="내 피드백 목록 (페이지네이션)")
    @GetMapping("/me")
    public Page<FeedbackResponse> myFeedbacks(Pageable pageable) {
        return service.listMyFeedbacks(pageable);
    }

    @Operation(summary="상품 피드백 목록 (페이지네이션)")
    @GetMapping("/products/{productId}")
    public Page<FeedbackResponse> productFeedbacks(@PathVariable Long productId, Pageable pageable) {
        return service.listByProduct(productId, pageable);
    }
}
