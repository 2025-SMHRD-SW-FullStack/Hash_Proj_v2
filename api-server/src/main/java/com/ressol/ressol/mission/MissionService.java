package com.ressol.ressol.mission;

import com.ressol.ressol.exception.BadRequestException;
import com.ressol.ressol.exception.ForbiddenException;
import com.ressol.ressol.exception.NotFoundException;
import com.ressol.ressol.merchant.CompanyChannel;
import com.ressol.ressol.merchant.CompanyChannelRepository;
import com.ressol.ressol.merchant.CompanyRepository;
import com.ressol.ressol.merchant.Company;
import com.ressol.ressol.mission.dto.MissionCreateRequest;
import com.ressol.ressol.mission.dto.MissionDto;
import com.ressol.ressol.mission.dto.MissionUpdateRequest;
import com.ressol.ressol.security.MerchantAccessGuard;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Objects;

@Service
@RequiredArgsConstructor
public class MissionService {

    private final MissionRepository missionRepo;
    private final CompanyRepository companyRepo;
    private final CompanyChannelRepository channelRepo;
    private final MerchantAccessGuard guard;
    private final MissionMapper mapper;

    private void validateCreateOrUpdate(Long companyId, Long channelId, Mission.Type type,
                                        Mission.PriceOption priceOption, Integer userPayAmount,
                                        LocalDateTime startAt, LocalDateTime endAt) {

        if (startAt.isAfter(endAt) || startAt.isEqual(endAt)) {
            throw new BadRequestException("invalid period");
        }

        if (priceOption == Mission.PriceOption.PARTIAL || priceOption == Mission.PriceOption.FULL) {
            if (userPayAmount == null || userPayAmount < 0) {
                throw new BadRequestException("userPayAmount required");
            }
        } else {
            // FREE
            if (userPayAmount != null && userPayAmount != 0) {
                throw new BadRequestException("FREE mission must have userPayAmount=0 or null");
            }
        }

        var ch = channelRepo.findById(channelId)
                .orElseThrow(() -> new NotFoundException("channel not found"));
        if (!Objects.equals(ch.getCompanyId(), companyId)) {
            throw new ForbiddenException("channel not in company");
        }
        if (type == Mission.Type.STORE && ch.getType() != CompanyChannel.Type.OFFLINE) {
            throw new BadRequestException("STORE mission requires OFFLINE channel");
        }
        if (type == Mission.Type.PRODUCT && ch.getType() != CompanyChannel.Type.ONLINE) {
            throw new BadRequestException("PRODUCT mission requires ONLINE channel");
        }
        // 회사 상태 체크(미션은 승인된 회사만)
        Company comp = companyRepo.findById(companyId)
                .orElseThrow(() -> new NotFoundException("company not found"));
        if (comp.getStatus() != Company.Status.APPROVED) {
            throw new ForbiddenException("company not approved");
        }
    }

    /* -------------------- Merchant -------------------- */

    @Transactional
    public MissionDto create(Long userId, MissionCreateRequest req){
        // 소유 + APPROVED 보장
        guard.requireCompanyOwnershipAndApproved(req.companyId(), userId);
        validateCreateOrUpdate(req.companyId(), req.channelId(), req.type(), req.priceOption(), req.userPayAmount(), req.startAt(), req.endAt());

        Mission m = Mission.builder()
                .companyId(req.companyId())
                .channelId(req.channelId())
                .type(req.type())
                .title(req.title())
                .description(req.description())
                .priceOption(req.priceOption())
                .userPayAmount(req.userPayAmount() == null ? 0 : req.userPayAmount())
                .quotaTotal(req.quotaTotal())
                .quotaDaily(req.quotaDaily())
                .startAt(req.startAt())
                .endAt(req.endAt())
                .requiredKeywordsCnt(req.requiredKeywordsCnt())
                .requiredPhotosCnt(req.requiredPhotosCnt())
                .status(Mission.Status.PENDING) // 제출 즉시 PENDING(관리자 승인 대기)
                .build();

        return mapper.toDto(missionRepo.save(m));
    }

    @Transactional
    public MissionDto update(Long userId, Long missionId, MissionUpdateRequest req){
        Mission m = missionRepo.findById(missionId)
                .orElseThrow(() -> new NotFoundException("mission not found"));
        // 소유 + APPROVED 보장
        guard.requireCompanyOwnershipAndApproved(m.getCompanyId(), userId);

        // ACTIVE/PAUSED 상태에서도 수정 허용 여부는 정책에 따라… MVP는 PENDING/DRAFT만 수정 가능하게
        if (m.getStatus() == Mission.Status.ACTIVE) {
            throw new BadRequestException("cannot edit ACTIVE mission");
        }

        validateCreateOrUpdate(m.getCompanyId(), m.getChannelId(), m.getType(), req.priceOption(), req.userPayAmount(), req.startAt(), req.endAt());

        m.setTitle(req.title());
        m.setDescription(req.description());
        m.setPriceOption(req.priceOption());
        m.setUserPayAmount(req.userPayAmount() == null ? 0 : req.userPayAmount());
        m.setQuotaTotal(req.quotaTotal());
        m.setQuotaDaily(req.quotaDaily());
        m.setStartAt(req.startAt());
        m.setEndAt(req.endAt());
        m.setRequiredKeywordsCnt(req.requiredKeywordsCnt());
        m.setRequiredPhotosCnt(req.requiredPhotosCnt());

        return mapper.toDto(missionRepo.save(m));
    }

    @Transactional(readOnly = true)
    public Page<MissionDto> listMine(Long userId, Long companyId, Pageable pageable){
        guard.requireCompanyOwnershipAndApproved(companyId, userId);
        return missionRepo.findByCompanyId(companyId, pageable).map(mapper::toDto);
    }

    @Transactional(readOnly = true)
    public MissionDto getMine(Long userId, Long missionId){
        Mission m = missionRepo.findById(missionId)
                .orElseThrow(() -> new NotFoundException("mission not found"));
        guard.requireCompanyOwnershipAndApproved(m.getCompanyId(), userId);
        return mapper.toDto(m);
    }

    /* -------------------- Admin -------------------- */

    @Transactional
    public void approve(Long missionId){
        Mission m = missionRepo.findById(missionId)
                .orElseThrow(() -> new NotFoundException("mission not found"));
        m.setStatus(Mission.Status.ACTIVE);
        missionRepo.save(m);
    }

    @Transactional
    public void reject(Long missionId, String reason){
        Mission m = missionRepo.findById(missionId)
                .orElseThrow(() -> new NotFoundException("mission not found"));
        m.setStatus(Mission.Status.REJECTED);
        // 필요하면 m.setDescription(m.getDescription()+"\n\n[반려사유] "+reason);
        missionRepo.save(m);
    }

    @Transactional
    public void pause(Long missionId){
        Mission m = missionRepo.findById(missionId)
                .orElseThrow(() -> new NotFoundException("mission not found"));
        m.setStatus(Mission.Status.PAUSED);
        missionRepo.save(m);
    }

    /* -------------------- Public (피드) -------------------- */

    @Transactional(readOnly = true)
    public Page<MissionDto> listActive(Pageable pageable){
        LocalDateTime now = LocalDateTime.now();
        return missionRepo
                .findByStatusAndStartAtBeforeAndEndAtAfter(Mission.Status.ACTIVE, now, now, pageable)
                .map(mapper::toDto);
    }

    @Transactional(readOnly = true)
    public MissionDto getPublic(Long missionId){
        Mission m = missionRepo.findById(missionId)
                .orElseThrow(() -> new NotFoundException("mission not found"));
        if (m.getStatus() != Mission.Status.ACTIVE) throw new NotFoundException("mission not active");
        LocalDateTime now = LocalDateTime.now();
        if (m.getStartAt().isAfter(now) || m.getEndAt().isBefore(now)) throw new NotFoundException("mission not in period");
        return mapper.toDto(m);
    }
}
