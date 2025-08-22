package com.meonjeo.meonjeo.review;

import com.meonjeo.meonjeo.application.MissionApplication;
import com.meonjeo.meonjeo.application.MissionApplicationRepository;
import com.meonjeo.meonjeo.mission.MissionRepository;
import com.meonjeo.meonjeo.security.AuthSupport;
import com.meonjeo.meonjeo.security.MerchantAccessGuard;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

@Tag(name="사장 · 리뷰검수", description="리뷰 승인/반려 및 포인트 지급")
@RestController
@RequestMapping("/api/merchant/reviews")
@SecurityRequirement(name="bearerAuth")
@RequiredArgsConstructor
public class MerchantReviewController {

    private final ReviewService service;
    private final MissionApplicationRepository appRepo;
    private final MissionRepository missionRepo;
    private final MerchantAccessGuard guard;
    private final AuthSupport auth;

    private void checkOwnershipByApplication(Long merchantUserId, Long applicationId){
        MissionApplication app = appRepo.findById(applicationId).orElseThrow();
        var mission = missionRepo.findById(app.getMissionId()).orElseThrow();
        guard.requireCompanyOwnershipAndApproved(mission.getCompanyId(), merchantUserId);
    }

    @Operation(summary="리뷰 승인(포인트 적립)")
    @PostMapping("/{applicationId}/approve")
    @Transactional
    public ResponseEntity<Void> approve(@PathVariable Long applicationId){
        Long me = auth.currentUserId();
        checkOwnershipByApplication(me, applicationId);
        service.approve(me, applicationId);
        return ResponseEntity.ok().build();
    }

    @Operation(summary="리뷰 반려")
    @PostMapping("/{applicationId}/reject")
    @Transactional
    public ResponseEntity<Void> reject(@PathVariable Long applicationId, @RequestBody(required=false) String reason){
        Long me = auth.currentUserId();
        checkOwnershipByApplication(me, applicationId);
        service.reject(me, applicationId, reason==null?"":reason);
        return ResponseEntity.ok().build();
    }
}