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

    @Transactional
    public ReviewDraft upsertDraft(Long userId, Long applicationId, String content, String photosJson){
        MissionApplication app = appRepo.findById(applicationId).orElseThrow(() -> new NotFoundException("application not found"));
        if (!app.getUserId().equals(userId)) throw new ForbiddenException("not yours");
        if (app.getStatus() != MissionApplication.Status.CONFIRMED) throw new BadRequestException("need confirmed");

        var draft = draftRepo.findByApplicationId(applicationId).orElse(ReviewDraft.builder().applicationId(applicationId).build());
        draft.setContent(content);
        draft.setPhotosJson(photosJson);
        return draftRepo.save(draft);
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
                .status(Review.Status.SUBMITTED).build();
        return reviewRepo.save(r);
    }

    @Transactional
    public void approve(Long merchantUserId, Long applicationId){
        // 권한 확인은 컨트롤러에서(가드) → 여기서는 상태 전이만
        Review r = reviewRepo.findByApplicationId(applicationId).orElseThrow(() -> new NotFoundException("review not found"));
        if (r.getStatus() != Review.Status.SUBMITTED) throw new BadRequestException("not submitted");
        r.setStatus(Review.Status.APPROVED);
        reviewRepo.save(r);

        // 포인트 적립
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
