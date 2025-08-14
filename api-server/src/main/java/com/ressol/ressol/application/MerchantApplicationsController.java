package com.ressol.ressol.application;

import com.ressol.ressol.exception.BadRequestException;
import com.ressol.ressol.exception.NotFoundException;
import com.ressol.ressol.mission.MissionRepository;
import com.ressol.ressol.security.AuthSupport;
import com.ressol.ressol.security.MerchantAccessGuard;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

@Tag(name="사장 · 신청관리", description="신청 확정/거절")
@RestController
@RequestMapping("/api/merchant/applications")
@SecurityRequirement(name="bearerAuth")
@RequiredArgsConstructor
public class MerchantApplicationsController {

    private final MissionApplicationRepository appRepo;
    private final MissionRepository missionRepo;
    private final MerchantAccessGuard guard;
    private final AuthSupport auth;
    private final com.ressol.ressol.mission.QuotaLockService quota;

    @Operation(summary="신청 확정")
    @PostMapping("/{id}/confirm")
    @Transactional
    public ResponseEntity<Void> confirm(@PathVariable Long id){
        Long me = auth.currentUserId();
        MissionApplication app = appRepo.findById(id).orElseThrow(() -> new NotFoundException("application not found"));
        var mission = missionRepo.findById(app.getMissionId()).orElseThrow(() -> new NotFoundException("mission not found"));
        guard.requireCompanyOwnershipAndApproved(mission.getCompanyId(), me);

        if (app.getStatus() != MissionApplication.Status.APPLIED) throw new BadRequestException("not applicable");
        app.setStatus(MissionApplication.Status.CONFIRMED);
        appRepo.save(app);
        return ResponseEntity.ok().build();
    }

    @Operation(summary="신청 거절")
    @PostMapping("/{id}/reject")
    @Transactional
    public ResponseEntity<Void> reject(@PathVariable Long id){
        Long me = auth.currentUserId();
        MissionApplication app = appRepo.findById(id).orElseThrow(() -> new NotFoundException("application not found"));
        var mission = missionRepo.findById(app.getMissionId()).orElseThrow(() -> new NotFoundException("mission not found"));
        guard.requireCompanyOwnershipAndApproved(mission.getCompanyId(), me);

        if (app.getStatus() != MissionApplication.Status.APPLIED) throw new BadRequestException("not applicable");
        app.setStatus(MissionApplication.Status.REJECTED);
        appRepo.save(app);
        // 거절 시 쿼터 복구
        quota.release(app.getMissionId());
        return ResponseEntity.ok().build();
    }
}
