package com.meonjeo.meonjeo.merchant;

import com.meonjeo.meonjeo.exception.BadRequestException;
import com.meonjeo.meonjeo.exception.NotFoundException;
import com.meonjeo.meonjeo.geo.NaverGeocodingService;
import com.meonjeo.meonjeo.merchant.dto.ChannelDto;
import com.meonjeo.meonjeo.merchant.dto.ChannelUpsertRequest;
import com.meonjeo.meonjeo.security.MerchantAccessGuard;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.Objects;

@Service @RequiredArgsConstructor
public class CompanyChannelService {

    private final CompanyRepository companyRepo;
    private final CompanyChannelRepository channelRepo;
    private final ChannelMapper mapper;
    private final MerchantAccessGuard guard;
    private final NaverGeocodingService geocoding; // ✅ 지오코딩 주입

    private void validateBusinessRules(Long companyId, ChannelUpsertRequest req, Long editingChannelId){
        // 타입/플랫폼 호환성
        if (req.type() == CompanyChannel.Type.OFFLINE) {
            // OFFLINE은 platform을 NONE으로 강제
            if (req.platform() != null && req.platform() != CompanyChannel.Platform.NONE) {
                throw new BadRequestException("OFFLINE channel must have platform=NONE");
            }
        } else {
            // ONLINE은 platform 필수
            if (req.platform() == null || req.platform() == CompanyChannel.Platform.NONE) {
                throw new BadRequestException("ONLINE channel requires platform");
            }
        }

        // 중복(같은 회사 내 플랫폼+externalId) 방지 (externalId가 있을 때만 체크)
        if (req.platform() != null && req.externalId() != null && !req.externalId().isBlank()) {
            boolean exists = channelRepo.existsByCompanyIdAndPlatformAndExternalId(companyId, req.platform(), req.externalId());
            if (exists) {
                // 수정인데 동일 레코드면 허용
                if (editingChannelId == null || channelRepo.findById(editingChannelId)
                        .filter(c -> Objects.equals(c.getExternalId(), req.externalId())
                                && c.getPlatform() == req.platform()
                                && Objects.equals(c.getCompanyId(), companyId))
                        .isEmpty()) {
                    throw new BadRequestException("duplicate platform+externalId in this company");
                }
            }
        }
    }

    @Transactional
    public ChannelDto create(Long userId, Long companyId, ChannelUpsertRequest req){
        guard.requireCompanyOwnershipAndApproved(companyId, userId);
        validateBusinessRules(companyId, req, null);

        CompanyChannel ch = CompanyChannel.builder()
                .companyId(companyId)
                .type(req.type())
                .displayName(req.displayName())
                .address(req.address())
                .contact(req.contact())
                .openingHours(req.openingHours())
                .platform(req.type() == CompanyChannel.Type.OFFLINE ? CompanyChannel.Platform.NONE : req.platform())
                .externalId(req.externalId())
                .url(req.url())
                .active(req.active() == null ? true : req.active())
                .build();

        // ✅ OFFLINE이면 주소 지오코딩 후 좌표/행정구역 저장
        if (ch.getType() == CompanyChannel.Type.OFFLINE && ch.getAddress() != null && !ch.getAddress().isBlank()) {
            var geo = geocoding.geocode(ch.getAddress());
            if (geo != null) {
                ch.setLatitude(toBD(geo.latitude()));
                ch.setLongitude(toBD(geo.longitude()));
                ch.setSido(geo.sido());
                ch.setSigungu(geo.sigungu());
                ch.setDong(geo.dong());
            }
        } else {
            // ONLINE이면 좌표/행정구역 비움
            ch.setLatitude(null); ch.setLongitude(null);
            ch.setSido(null); ch.setSigungu(null); ch.setDong(null);
        }

        return mapper.toDto(channelRepo.save(ch));
    }

    @Transactional
    public ChannelDto update(Long userId, Long companyId, Long channelId, ChannelUpsertRequest req){
        guard.requireCompanyOwnershipAndApproved(companyId, userId);
        CompanyChannel ch = channelRepo.findByIdAndCompanyId(channelId, companyId)
                .orElseThrow(() -> new NotFoundException("channel not found"));
        validateBusinessRules(companyId, req, channelId);

        boolean typeChanged = ch.getType() != req.type();
        boolean addressChanged = !Objects.equals(ch.getAddress(), req.address());

        ch.setType(req.type());
        ch.setDisplayName(req.displayName());
        ch.setAddress(req.address());
        ch.setContact(req.contact());
        ch.setOpeningHours(req.openingHours());
        ch.setPlatform(req.type() == CompanyChannel.Type.OFFLINE ? CompanyChannel.Platform.NONE : req.platform());
        ch.setExternalId(req.externalId());
        ch.setUrl(req.url());
        ch.setActive(req.active() == null ? ch.isActive() : req.active());

        // ✅ OFFLINE으로 유지/변경되었고 주소가 바뀌었으면 지오코딩
        if (ch.getType() == CompanyChannel.Type.OFFLINE && (typeChanged || addressChanged)) {
            if (ch.getAddress() != null && !ch.getAddress().isBlank()) {
                var geo = geocoding.geocode(ch.getAddress());
                if (geo != null) {
                    ch.setLatitude(toBD(geo.latitude()));
                    ch.setLongitude(toBD(geo.longitude()));
                    ch.setSido(geo.sido());
                    ch.setSigungu(geo.sigungu());
                    ch.setDong(geo.dong());
                }
            }
        }

        // ✅ ONLINE으로 전환되면 좌표/행정구역 비우기
        if (ch.getType() == CompanyChannel.Type.ONLINE) {
            ch.setLatitude(null); ch.setLongitude(null);
            ch.setSido(null); ch.setSigungu(null); ch.setDong(null);
        }

        return mapper.toDto(channelRepo.save(ch));
    }

    @Transactional(readOnly = true)
    public List<ChannelDto> list(Long userId, Long companyId){
        guard.requireCompanyOwnershipAndApproved(companyId, userId);
        return channelRepo.findByCompanyIdOrderByIdDesc(companyId).stream().map(mapper::toDto).toList();
    }

    @Transactional
    public void deactivate(Long userId, Long companyId, Long channelId){
        guard.requireCompanyOwnershipAndApproved(companyId, userId);
        CompanyChannel ch = channelRepo.findByIdAndCompanyId(channelId, companyId)
                .orElseThrow(() -> new NotFoundException("channel not found"));
        ch.setActive(false);
        channelRepo.save(ch);
    }

    private BigDecimal toBD(Double v){ return v == null ? null : BigDecimal.valueOf(v); }
}
