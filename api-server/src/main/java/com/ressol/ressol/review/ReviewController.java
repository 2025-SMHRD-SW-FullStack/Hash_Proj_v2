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

    @Operation(summary="리뷰 드래프트 저장/업데이트")
    @PutMapping("/reviews/drafts/{applicationId}")
    public ResponseEntity<ReviewDraft> saveDraft(@PathVariable Long applicationId, @Valid @RequestBody ReviewDraftRequest req){
        Long me = auth.currentUserId();
        return ResponseEntity.ok(service.upsertDraft(me, applicationId, req.content(), req.photosJson()));
    }

    @Operation(summary="리뷰 제출")
    @PostMapping("/reviews/{applicationId}/submit")
    public ResponseEntity<Review> submit(@PathVariable Long applicationId){
        Long me = auth.currentUserId();
        return ResponseEntity.ok(service.submit(me, applicationId));
    }
}
