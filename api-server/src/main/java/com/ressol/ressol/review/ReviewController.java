// src/main/java/com/ressol/ressol/review/ReviewController.java
package com.ressol.ressol.review;

import com.ressol.ressol.review.dto.ReviewDraftRequest;
import com.ressol.ressol.security.AuthSupport;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@Tag(name="사용자 · 리뷰", description="리뷰 드래프트/제출")
@RestController
@RequestMapping("/api")
@SecurityRequirement(name="bearerAuth")
@RequiredArgsConstructor
public class ReviewController {

    private final ReviewService service;
    private final AuthSupport auth;

    @Operation(summary="리뷰 드래프트 조회(임시저장 복구)")
    @GetMapping("/reviews/drafts/{applicationId}")
    public ResponseEntity<ReviewDraft> getDraft(@PathVariable Long applicationId){
        Long me = auth.currentUserId();
        var draft = service.getDraft(me, applicationId);

        if (draft == null) {
            // 처음 진입: 빈 값으로 200 반환 → 프론트는 항상 성공 흐름
            var empty = ReviewDraft.builder()
                    .applicationId(applicationId)
                    .content(null)
                    .photosJson("[]")
                    .reviewUrl(null)
                    .keywordsJson("[]")   // 키워드도 비어있음
                    .build();
            return ResponseEntity.ok(empty);
        }
        return ResponseEntity.ok(draft);
    }

    @Operation(summary="리뷰 드래프트 저장/업데이트")
    @PutMapping("/reviews/drafts/{applicationId}")
    public ResponseEntity<ReviewDraft> saveDraft(@PathVariable Long applicationId,
                                                 @Valid @RequestBody ReviewDraftRequest req){
        Long me = auth.currentUserId();
        var saved = service.upsertDraft(me, applicationId, req.content(), req.photosJson(), req.reviewUrl(), req.keywordsJson());
        return ResponseEntity.ok(saved);
    }

    @Operation(summary="리뷰 제출")
    @PostMapping("/reviews/{applicationId}/submit")
    public ResponseEntity<Review> submit(@PathVariable Long applicationId){
        Long me = auth.currentUserId();
        return ResponseEntity.ok(service.submit(me, applicationId));
    }
}
