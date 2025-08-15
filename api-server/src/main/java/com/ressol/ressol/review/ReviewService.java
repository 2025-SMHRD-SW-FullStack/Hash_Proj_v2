package com.ressol.ressol.review;

import com.ressol.ressol.exception.ReviewException;
import com.ressol.ressol.review.dto.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;

@Service
@RequiredArgsConstructor
public class ReviewService {

    private final ReviewRepository reviewRepo;
    private final ReviewGenerationLogRepository logRepo;
    private final ReviewDraftSnapshotRepository snapshotRepo;
    private final UserReviewAssetRepository assetRepo;
    private final UserPromptPresetRepository presetRepo;
    private final AiReviewClient ai;
    private final ReviewPolicyService policy;
    private final StyleService style;

    // ========== AUTOSAVE ==========
    /** 자동 저장(충돌 허용 + 서버 스냅샷) */
    @Transactional
    public ReviewResponse autosave(Long userId, ReviewAutosaveRequest req) {
        var opt = reviewRepo.findByMissionIdAndUserIdAndStatus(req.missionId(), userId, ReviewStatus.DRAFT);
        Review review;

        if (opt.isPresent()) {
            review = opt.get();
            Long expected = req.expectedVersion();
            Long serverVersion = review.getVersion();
            boolean conflict = expected != null && serverVersion != null && !expected.equals(serverVersion);
            if (conflict) {
                snapshotRepo.save(ReviewDraftSnapshot.builder()
                        .reviewId(review.getId())
                        .userId(userId)
                        .content(review.getContent() == null ? "" : review.getContent())
                        .versionAt(serverVersion)
                        .build());
            }
        } else {
            review = reviewRepo.save(Review.builder()
                    .missionId(req.missionId())
                    .userId(userId)
                    .status(ReviewStatus.DRAFT)
                    .build());
        }

        LocalDateTime now = LocalDateTime.now();
        review.setContent(req.content());
        review.setLastAutosaveAt(now);
        Review saved = reviewRepo.save(review);

        if (policy.shouldSnapshot(review.getLastSnapshotAt(), now)) {
            snapshotRepo.save(ReviewDraftSnapshot.builder()
                    .reviewId(saved.getId())
                    .userId(userId)
                    .content(req.content())
                    .versionAt(saved.getVersion())
                    .build());
            saved.setLastSnapshotAt(now);
            reviewRepo.save(saved);

            var list = snapshotRepo.findTop50ByReviewIdOrderByCreatedAtDesc(saved.getId());
            int max = policy.snapshotKeepMax();
            if (list.size() > max) list.stream().skip(max).forEach(s -> snapshotRepo.deleteById(s.getId()));
        }

        return toDto(saved);
    }

    // ========== 생성 (Step3 통합) ==========
    /**
     * 입력(미션종류/키워드/사진) + 개인화/외부데이터/사이트템플릿 폴백 순서로 프롬프트 구성.
     */
    @Transactional
    public ReviewResponse generateFromForm(Long userId, ReviewGenerateFormRequest req) {

        // 1) 검증: 키워드 개수
        List<String> owner = Optional.ofNullable(req.ownerKeywords()).orElse(List.of());
        List<String> user  = Optional.ofNullable(req.userKeywords()).orElse(List.of());
        if (owner.size() < 1 || owner.size() > 5) throw ReviewException.invalidState("사장님 키워드는 1~5개여야 합니다.");
        if (user.size()  < 1 || user.size()  > 3) throw ReviewException.invalidState("사장님 직접 입력 키워드는 1~3개여야 합니다.");

        // 2) 키워드 병합(중복 제거)
        LinkedHashSet<String> merged = new LinkedHashSet<>();
        owner.forEach(s -> { if (s != null && !s.isBlank()) merged.add(s.trim()); });
        user.forEach(s  -> { if (s != null && !s.isBlank()) merged.add(s.trim()); });
        List<String> keywords = List.copyOf(merged);

        // 3) 글자수 정책(플랫폼 우선, 없으면 기본)
        Integer desired = null;
        if (req.extras() != null && req.extras().get("charLimit") instanceof Number n) desired = n.intValue();
        int limit = (req.platform() != null)
                ? policy.resolveCharLimitForPlatform(req.platform(), desired)
                : policy.resolveCharLimit(desired);

        // 4) 초안 보장
        Review draft = reviewRepo.findByMissionIdAndUserIdAndStatus(req.missionId(), userId, ReviewStatus.DRAFT)
                .orElseGet(() -> reviewRepo.save(Review.builder()
                        .missionId(req.missionId())
                        .userId(userId)
                        .status(ReviewStatus.DRAFT)
                        .charLimit(limit)
                        .build()));

        // 5) extras 구성: 입력 + 개인화 + 샘플 + 폴백 힌트
        Map<String, Object> extras = new HashMap<>();
        if (req.extras() != null) extras.putAll(req.extras());
        extras.put("missionType", req.missionType().name());
        if (req.platform() != null) extras.put("platform", req.platform());
        if (req.mediaIds() != null && !req.mediaIds().isEmpty()) extras.put("mediaIds", req.mediaIds());
        extras.put("keywordBreakdown", Map.of("owner", owner, "user", user));

        // (a) 개인화: 사용자 프로파일(systemPrompt)
        var profile = style.getOrAnalyze(userId);
        boolean hasProfilePrompt = profile != null && profile.getSystemPrompt() != null && !profile.getSystemPrompt().isBlank();
        if (hasProfilePrompt) {
            extras.put("userSystemPrompt", profile.getSystemPrompt());
            extras.put("styleHintsSource", "PROFILE");
        } else {
            // (b) 과거 샘플 텍스트(최대 5개) → 톤 힌트
            var recentAssets = assetRepo.findTop5ByUserIdOrderByCreatedAtDesc(userId);
            List<String> styleSamples = new ArrayList<>();
            for (var a : recentAssets) {
                if (a.getAssetType() == UserReviewAsset.AssetType.TEXT && a.getTextContent() != null && !a.getTextContent().isBlank()) {
                    styleSamples.add(a.getTextContent());
                }
            }
            if (!styleSamples.isEmpty()) {
                extras.put("styleSamples", styleSamples); // ai-server가 톤 추출
                extras.put("styleHintsSource", "USER_ASSETS");
            } else {
                // (c) 외부 말투 데이터가 있다면(필요 시 확장: extras.externalStyleSamples)
                // 현재는 없음 → ai-server 폴백 사용
                extras.put("styleHintsSource", "SITE_TEMPLATES"); // 사이트별 예시로 폴백
            }
        }

        // 6) AI 생성
        AiReviewResponse aiRes = ai.generate(new AiReviewRequest(
                req.missionId(), userId, keywords, null, null, limit, extras));

        // 7) 저장 + 로그
        draft.setContent(aiRes.content());
        draft.setCharLimit(limit);
        Review saved = reviewRepo.save(draft);

        logRepo.save(ReviewGenerationLog.builder()
                .reviewId(saved.getId()).userId(userId)
                .type(ReviewGenerationType.MANUAL)
                .promptSnapshot(String.valueOf(extras))
                .resultText(aiRes.content())
                .usedPoints(0)
                .build());

        return toDto(saved);
    }

    // ========== 재생성 ==========
    @Transactional
    public ReviewResponse regenerate(Long userId, ReviewRegenerateRequest req) {
        Review review = reviewRepo.findById(req.reviewId())
                .orElseThrow(() -> ReviewException.notFound(req.reviewId()));
        if (!review.getUserId().equals(userId)) throw ReviewException.invalidState("권한 없음");

        policy.ensureCanRegenerate(review);
        int charLimit = (req.platform() != null)
                ? policy.resolveCharLimitForPlatform(req.platform(), req.desiredLength())
                : policy.resolveCharLimit(req.desiredLength());
        int pointCost = policy.calcPointCost(review.getRegenCount());

        // 프리셋 저장/업데이트(커스텀 프롬프트가 있는 경우)
        if (req.customPrompt() != null && !req.customPrompt().isBlank()) {
            String platform = req.platform();
            var preset = presetRepo.findTopByUserIdAndPlatformOrderByUseCountDesc(userId, platform)
                    .orElse(UserPromptPreset.builder()
                            .userId(userId)
                            .platform(platform)
                            .prompt(req.customPrompt())
                            .useCount(0)
                            .build());
            preset.setPrompt(req.customPrompt());
            preset.setUseCount((preset.getUseCount() == null ? 0 : preset.getUseCount()) + 1);
            presetRepo.save(preset);
        }

        // 재생성 extras 병합(+개인화)
        Map<String, Object> extras = new HashMap<>();
        if (req.extras() != null) extras.putAll(req.extras());
        if (req.platform() != null) extras.put("platform", req.platform());
        if (req.baseEditedText() != null && !req.baseEditedText().isBlank()) extras.put("baseEditedText", req.baseEditedText());
        if (req.customPrompt()   != null && !req.customPrompt().isBlank())   extras.put("customPrompt",   req.customPrompt());

        var profile = style.getOrAnalyze(userId);
        if (profile != null && profile.getSystemPrompt() != null && !profile.getSystemPrompt().isBlank()) {
            extras.put("userSystemPrompt", profile.getSystemPrompt());
        }

        AiReviewResponse aiRes = ai.generate(new AiReviewRequest(
                review.getMissionId(), userId,
                req.adjustKeywords(),      // 선택
                req.adjustTone(),          // 선택
                null,                      // style 미사용
                charLimit,
                extras
        ));

        review.setContent(aiRes.content());
        review.setRegenCount(review.getRegenCount() + 1);
        review.setCharLimit(charLimit);
        Review saved = reviewRepo.save(review);

        logRepo.save(ReviewGenerationLog.builder()
                .reviewId(saved.getId()).userId(userId)
                .type(ReviewGenerationType.REGENERATE)
                .promptSnapshot(String.valueOf(extras))
                .resultText(aiRes.content())
                .usedPoints(pointCost)
                .build());

        // 편집본을 학습 샘플로 저장
        if (req.baseEditedText() != null && !req.baseEditedText().isBlank()) {
            UserReviewAsset asset = UserReviewAsset.builder()
                    .userId(userId)
                    .assetType(UserReviewAsset.AssetType.TEXT)
                    .textContent(req.baseEditedText())
                    .analyzed(false)
                    .build();
            assetRepo.save(asset);
        }

        return toDto(saved);
    }

    // ========== 초안 저장 ==========
    @Transactional
    public ReviewResponse saveDraft(Long userId, ReviewDraftRequest req) {
        Review draft = reviewRepo.findByMissionIdAndUserIdAndStatus(req.missionId(), userId, ReviewStatus.DRAFT)
                .orElseThrow(() -> ReviewException.invalidState("초안이 없습니다. 먼저 생성하세요."));
        draft.setContent(req.content());
        return toDto(reviewRepo.save(draft));
    }

    // ========== 제출 ==========
    @Transactional
    public ReviewResponse submit(Long userId, ReviewSubmitRequest req) {
        Review review = reviewRepo.findById(req.reviewId())
                .orElseThrow(() -> ReviewException.notFound(req.reviewId()));
        if (!review.getUserId().equals(userId)) throw ReviewException.invalidState("권한 없음");
        if (review.getStatus() == ReviewStatus.SUBMITTED) throw ReviewException.invalidState("이미 제출되었습니다.");
        review.setStatus(ReviewStatus.SUBMITTED);

        // 확정본을 학습 샘플로 저장
        if (review.getContent() != null && !review.getContent().isBlank()) {
            UserReviewAsset asset = UserReviewAsset.builder()
                    .userId(userId)
                    .assetType(UserReviewAsset.AssetType.TEXT)
                    .textContent(review.getContent())
                    .analyzed(false)
                    .build();
            assetRepo.save(asset);
        }
        return toDto(reviewRepo.save(review));
    }

    // ========== 단건 조회 ==========
    @Transactional(readOnly = true)
    public ReviewResponse get(Long userId, Long reviewId) {
        Review r = reviewRepo.findById(reviewId).orElseThrow(() -> ReviewException.notFound(reviewId));
        if (!r.getUserId().equals(userId)) throw ReviewException.invalidState("권한 없음");
        return toDto(r);
    }

    private ReviewResponse toDto(Review r){
        return new ReviewResponse(
                r.getId(), r.getMissionId(), r.getUserId(),
                r.getStatus(), r.getContent(), r.getRegenCount(),
                r.getVersion()
        );
    }
}
