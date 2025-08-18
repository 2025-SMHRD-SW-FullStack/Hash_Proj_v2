// src/main/java/com/ressol/ressol/review/ReviewService.java
package com.ressol.ressol.review;

import com.ressol.ressol.application.MissionApplication;
import com.ressol.ressol.application.MissionApplicationRepository;
import com.ressol.ressol.exception.*;
import com.ressol.ressol.mission.MissionRepository;
import com.ressol.ressol.point.PointService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service @RequiredArgsConstructor
public class ReviewService {
    private final MissionApplicationRepository appRepo;
    private final ReviewDraftRepository draftRepo;
    private final ReviewRepository reviewRepo;
    private final MissionRepository missionRepo;
    private final PointService pointService;

    /**
     * ✅ 기존 시그니처 유지(역호환). 내부에서 신규 오버로드 호출
     */
    @Transactional
    public ReviewDraft upsertDraft(Long userId, Long applicationId, String content, String photosJson, String reviewUrl){
        return upsertDraft(userId, applicationId, content, photosJson, reviewUrl, null);
    }

    /**
     * ✅ 신규: keywordsJson 포함 버전
     */
    @Transactional
    public ReviewDraft upsertDraft(Long userId, Long applicationId, String content, String photosJson, String reviewUrl, String keywordsJson){
        MissionApplication app = appRepo.findById(applicationId)
                .orElseThrow(() -> new NotFoundException("application not found"));
        if (!app.getUserId().equals(userId)) throw new ForbiddenException("not yours");
        if (app.getStatus() != MissionApplication.Status.CONFIRMED) throw new BadRequestException("need confirmed");

        var draft = draftRepo.findByApplicationId(applicationId)
                .orElse(ReviewDraft.builder().applicationId(applicationId).build());

        draft.setContent(content);
        draft.setPhotosJson(photosJson);
        draft.setReviewUrl(reviewUrl);
        draft.setKeywordsJson(keywordsJson); // ✅ 추가

        return draftRepo.save(draft);
    }

    /**
     * ✅ 신규: 드래프트 조회 (없으면 null 반환 선택)
     *  - 정책상 '확정(CONFIRMED) 이후 작성 가능'을 GET에도 동일하게 적용
     *  - 없을 경우 200+null/빈값으로 내려주고 싶으면 컨트롤러에서 처리
     */
    @Transactional(readOnly = true)
    public ReviewDraft getDraft(Long userId, Long applicationId){
        MissionApplication app = appRepo.findById(applicationId)
                .orElseThrow(() -> new NotFoundException("application not found"));
        if (!app.getUserId().equals(userId)) throw new ForbiddenException("not yours");
        if (app.getStatus() != MissionApplication.Status.CONFIRMED) throw new BadRequestException("need confirmed");

        return draftRepo.findByApplicationId(applicationId).orElse(null);
    }

    @Transactional
    public Review submit(Long userId, Long applicationId){
        MissionApplication app = appRepo.findById(applicationId).orElseThrow(() -> new NotFoundException("application not found"));
        if (!app.getUserId().equals(userId)) throw new ForbiddenException("not yours");
        if (app.getStatus() != MissionApplication.Status.CONFIRMED) throw new BadRequestException("need confirmed");

        var draft = draftRepo.findByApplicationId(applicationId).orElseThrow(() -> new BadRequestException("no draft"));
        if (reviewRepo.findByApplicationId(applicationId).isPresent()) throw new ConflictException("already submitted");

        Review r = Review.builder()
                .applicationId(applicationId).userId(app.getUserId()).companyId(app.getCompanyId())
                .content(draft.getContent()).photosJson(draft.getPhotosJson())
                .reviewUrl(draft.getReviewUrl())
                .status(Review.Status.SUBMITTED).build();
        return reviewRepo.save(r);
    }

    @Transactional
    public void approve(Long merchantUserId, Long applicationId){
        Review r = reviewRepo.findByApplicationId(applicationId).orElseThrow(() -> new NotFoundException("review not found"));
        if (r.getStatus() != Review.Status.SUBMITTED) throw new BadRequestException("not submitted");
        r.setStatus(Review.Status.APPROVED);
        reviewRepo.save(r);

        pointService.credit(r.getUserId(), pointService.reviewUnitPoint(), PointService.Reason.REVIEW_APPROVED, applicationId);
    }

    @Transactional
    public void reject(Long merchantUserId, Long applicationId, String reason){
        Review r = reviewRepo.findByApplicationId(applicationId).orElseThrow(() -> new NotFoundException("review not found"));
        if (r.getStatus() != Review.Status.SUBMITTED) throw new BadRequestException("not submitted");
        r.setStatus(Review.Status.REJECTED);
        reviewRepo.save(r);
    }
}
