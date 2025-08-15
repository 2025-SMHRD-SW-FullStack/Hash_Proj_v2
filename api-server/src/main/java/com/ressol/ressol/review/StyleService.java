package com.ressol.ressol.review;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.ressol.ressol.review.dto.AiStyleAnalyzeRequest;
import com.ressol.ressol.review.dto.AiStyleClient;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class StyleService {

    private final UserStyleProfileRepository profileRepo;
    private final UserReviewAssetRepository assetRepo;
    private final AiStyleClient ai;

    // ObjectMapper는 매번 new 하지 말고 필드로 하나만 사용
    private final ObjectMapper om = new ObjectMapper();

    /**
     * 사용자 스타일 프로파일을 반환.
     * - 프로파일이 없고 새 샘플도 없으면 "빈 프로파일"을 생성해서 반환
     * - 미분석 샘플이 있으면 AI에 분석 요청 후 프로파일 갱신
     */
    @Transactional
    public UserStyleProfile getOrAnalyze(Long userId) {

        UserStyleProfile profile = profileRepo.findByUserId(userId).orElse(null);
        List<UserReviewAsset> newAssets = assetRepo.findByUserIdAndAnalyzedFalse(userId);

        // 1) 프로파일이 없고, 샘플도 없으면 기본(빈) 프로파일 생성
        if (profile == null && (newAssets == null || newAssets.isEmpty())) {
            profile = UserStyleProfile.builder()
                    .userId(userId)
                    .toneLabel(null)
                    .styleTagsJson("[]")
                    .systemPrompt(null)
                    .sampleCount(0)
                    .lastAnalyzedAt(null)
                    .build();
            return profileRepo.save(profile);
        }

        // 2) 미분석 샘플이 있는 경우에만 분석 수행
        if (newAssets != null && !newAssets.isEmpty()) {
            List<String> texts = new ArrayList<>();
            List<String> images = new ArrayList<>();

            for (UserReviewAsset a : newAssets) {
                if (a.getAssetType() == UserReviewAsset.AssetType.TEXT
                        && a.getTextContent() != null && !a.getTextContent().isBlank()) {
                    texts.add(a.getTextContent());
                } else if (a.getAssetType() == UserReviewAsset.AssetType.IMAGE
                        && a.getImageUrl() != null && !a.getImageUrl().isBlank()) {
                    images.add(a.getImageUrl());
                }
            }

            try {
                var res = ai.analyze(new AiStyleAnalyzeRequest(userId, texts, images));

                if (profile == null) profile = new UserStyleProfile();
                profile.setUserId(userId);
                profile.setToneLabel(res.toneLabel());
                profile.setStyleTagsJson(om.valueToTree(res.styleTags()).toString());
                profile.setSystemPrompt(res.systemPrompt());
                int consumed = (res.consumedSamples() == null ? texts.size() : res.consumedSamples());
                profile.setSampleCount((profile.getSampleCount() == null ? 0 : profile.getSampleCount()) + consumed);
                profile.setLastAnalyzedAt(LocalDateTime.now());
                profile = profileRepo.save(profile);

                // 샘플 사용 완료 표시
                for (UserReviewAsset a : newAssets) {
                    a.setAnalyzed(true);
                }
                assetRepo.saveAll(newAssets);
            } catch (Exception e) {
                // AI 서버 장애 시 기존 프로파일을 그대로 반환(서비스 전체 장애 방지)
                // 로깅만 하고 삼킵니다. 필요하면 Logger 주입해서 warn으로 남기세요.
            }
        }

        return profile;
    }
}
