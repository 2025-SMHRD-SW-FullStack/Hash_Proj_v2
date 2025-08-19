package com.ressol.ressol.application;

import com.ressol.ressol.exception.*;
import com.ressol.ressol.merchant.Company;
import com.ressol.ressol.merchant.CompanyRepository;
import com.ressol.ressol.mission.Mission;
import com.ressol.ressol.mission.MissionRepository;
import com.ressol.ressol.mission.QuotaLockService;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Service @RequiredArgsConstructor
public class ApplicationService {
    private final MissionRepository missionRepo;
    private final CompanyRepository companyRepo;
    private final MissionApplicationRepository appRepo;
    private final QuotaLockService quota;

    @Transactional
    public MissionApplication apply(Long userId, Long missionId){
        Mission m = missionRepo.findById(missionId).orElseThrow(() -> new NotFoundException("mission not found"));
        if (m.getStatus() != Mission.Status.ACTIVE) throw new BadRequestException("mission not active");
        LocalDateTime now = LocalDateTime.now();
        if (m.getStartAt().isAfter(now) || m.getEndAt().isBefore(now)) throw new BadRequestException("not in period");

        // 자기 회사 미션 신청 금지
        var comp = companyRepo.findById(m.getCompanyId()).orElseThrow(() -> new NotFoundException("company not found"));
        if (comp.getOwner().getId().equals(userId)) throw new ForbiddenException("cannot apply to own mission");

        // 쿼터락
        boolean ok = quota.tryAcquire(m.getId(), m.getQuotaTotal(), m.getQuotaDaily());
        if (!ok) throw new ConflictException("quota exhausted");

        try {
            MissionApplication app = MissionApplication.builder()
                    .missionId(m.getId()).companyId(m.getCompanyId()).channelId(m.getChannelId())
                    .userId(userId).status(MissionApplication.Status.APPLIED).build();
            return appRepo.save(app);
        } catch (DataIntegrityViolationException e){
            // 중복 신청 보정
            quota.release(m.getId());
            throw new ConflictException("already applied");
        }
    }

    @Transactional
    public void cancel(Long userId, Long applicationId){
        MissionApplication app = appRepo.findByIdAndUserId(applicationId, userId)
                .orElseThrow(() -> new NotFoundException("application not found"));
        if (app.getStatus() != MissionApplication.Status.APPLIED) throw new BadRequestException("cannot cancel");
        app.setStatus(MissionApplication.Status.CANCELED);
        appRepo.save(app);
        quota.release(app.getMissionId()); // 당일 daily가 지났으면 daily는 복구 안됨(의도)
    }
}
