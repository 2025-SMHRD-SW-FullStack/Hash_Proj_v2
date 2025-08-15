package com.ressol.ressol.review;

import com.ressol.ressol.review.dto.*;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.ExampleObject;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/reviews")
@RequiredArgsConstructor
@Tag(name = "Review", description = "리뷰 생성/관리 API")
@SecurityRequirement(name = "bearerAuth") // JWT 미사용이면 제거
public class ReviewController {

    private final ReviewService reviewService;

    // TODO: Security 연동 시 교체
    private Long currentUserId() { return 1L; }

    // ----- 생성 -----
    @Operation(
            summary = "Step3 통합 생성",
            description = "사장님 키워드(1~5, 필수) + 사장님 직접 입력(1~3, 필수)을 병합하여 AI가 자연스러운 리뷰를 생성합니다."
    )
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "성공",
                    content = @Content(schema = @Schema(implementation = ReviewResponse.class))),
            @ApiResponse(responseCode = "400", description = "검증 실패"),
            @ApiResponse(responseCode = "401", description = "인증 필요")
    })
    @PostMapping("/generate/form")
    public ResponseEntity<ReviewResponse> generateFromForm(
            @io.swagger.v3.oas.annotations.parameters.RequestBody(
                    required = true,
                    content = @Content(mediaType = "application/json",
                            schema = @Schema(implementation = ReviewGenerateFormRequest.class),
                            examples = @ExampleObject(name = "기본", value = """
                                    {
                                      "missionId": 1001,
                                      "ownerKeywords": ["양 많음","친절함"],
                                      "userKeywords": ["사진 맛집","빠른 배달"],
                                      "mediaIds": [11,12],
                                      "platform": "NAVER_STORE",
                                      "extras": { "charLimit": 700 }
                                    }
                                    """)))
            @Valid @RequestBody ReviewGenerateFormRequest req
    ) {
        return ResponseEntity.ok(reviewService.generateFromForm(currentUserId(), req));
    }

    // ----- 자동저장 -----
    @Operation(summary = "자동저장", description = "작성 중 리뷰를 주기적으로 저장합니다. 충돌 시 서버본을 스냅샷으로 보관합니다.")
    @PostMapping("/draft/autosave")
    public ResponseEntity<ReviewResponse> autosave(
            @io.swagger.v3.oas.annotations.parameters.RequestBody(
                    required = true,
                    content = @Content(schema = @Schema(implementation = ReviewAutosaveRequest.class),
                            examples = @ExampleObject(value = """
                                    {
                                      "missionId": 1001,
                                      "content": "작성 중 본문입니다...",
                                      "expectedVersion": 0
                                    }
                                    """)))
            @Valid @RequestBody ReviewAutosaveRequest req
    ) {
        return ResponseEntity.ok(reviewService.autosave(currentUserId(), req));
    }

    // ----- 재생성 -----
    @Operation(
            summary = "재생성",
            description = "편집본 기반 혹은 커스텀 프롬프트 기반 재생성(최대 N회, 정책 적용)."
    )
    @PostMapping("/regenerate")
    public ResponseEntity<ReviewResponse> regenerate(
            @io.swagger.v3.oas.annotations.parameters.RequestBody(
                    required = true,
                    content = @Content(schema = @Schema(implementation = ReviewRegenerateRequest.class),
                            examples = @ExampleObject(value = """
                                    {
                                      "reviewId": 2001,
                                      "adjustKeywords": ["상세사진 강조"],
                                      "adjustTone": "전문가톤",
                                      "desiredLength": 900,
                                      "extras": {
                                        "customPrompt": "더 담백하고 사실 위주로",
                                        "baseEditedText": "제가 수정한 본문 ..."
                                      }
                                    }
                                    """)))
            @Valid @RequestBody ReviewRegenerateRequest req
    ) {
        return ResponseEntity.ok(reviewService.regenerate(currentUserId(), req));
    }

    // ----- 초안 저장(수동) -----
    @Operation(summary = "초안 저장/수정", description = "현재 DRAFT 리뷰 본문을 저장/수정합니다.")
    @PostMapping("/draft")
    public ResponseEntity<ReviewResponse> saveDraft(
            @io.swagger.v3.oas.annotations.parameters.RequestBody(
                    required = true,
                    content = @Content(schema = @Schema(implementation = ReviewDraftRequest.class),
                            examples = @ExampleObject(value = """
                                    { "missionId": 1001, "content": "초안 내용..." }
                                    """)))
            @Valid @RequestBody ReviewDraftRequest req
    ) {
        return ResponseEntity.ok(reviewService.saveDraft(currentUserId(), req));
    }

    // ----- 제출 -----
    @Operation(summary = "제출", description = "DRAFT 리뷰를 제출 상태로 변경합니다.")
    @PostMapping("/submit")
    public ResponseEntity<ReviewResponse> submit(
            @io.swagger.v3.oas.annotations.parameters.RequestBody(
                    required = true,
                    content = @Content(schema = @Schema(implementation = ReviewSubmitRequest.class),
                            examples = @ExampleObject(value = "{\"reviewId\":2001}")))
            @Valid @RequestBody ReviewSubmitRequest req
    ) {
        return ResponseEntity.ok(reviewService.submit(currentUserId(), req));
    }

    // ----- 단건 조회 -----
    @Operation(summary = "단건 조회", description = "리뷰 상세를 조회합니다.")
    @GetMapping("/{id}")
    public ResponseEntity<ReviewResponse> get(@PathVariable Long id){
        return ResponseEntity.ok(reviewService.get(currentUserId(), id));
    }
}
