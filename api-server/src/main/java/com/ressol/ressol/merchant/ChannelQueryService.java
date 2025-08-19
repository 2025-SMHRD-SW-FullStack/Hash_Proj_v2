package com.ressol.ressol.merchant;

import com.ressol.ressol.merchant.dto.NearbyChannelResponse;
import com.ressol.ressol.merchant.dto.RegionChannelResponse;
import com.ressol.ressol.merchant.projection.NearbyChannelRow;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.*;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class ChannelQueryService {

    private final CompanyChannelRepository repo;

    public List<NearbyChannelResponse> findNearby(double lat, double lng, double radiusKm, int page, int size) {
        int limit = Math.max(1, size);
        int offset = Math.max(0, page) * limit;
        List<NearbyChannelRow> rows = repo.findNearbyOffline(lat, lng, radiusKm, limit, offset);
        return rows.stream().map(r -> new NearbyChannelResponse(
                r.getId(), r.getCompanyId(), r.getName(), r.getAddress(),
                r.getLatitude(), r.getLongitude(), r.getDistanceKm()
        )).toList();
    }

    public List<RegionChannelResponse> findByRegion(String sido, String sigungu, int page, int size) {
        var pageable = PageRequest.of(Math.max(0, page), Math.max(1, size));
        return repo.findByRegionOrderByDongAsc(sido, sigungu, pageable).stream()
                .map(cc -> new RegionChannelResponse(
                        cc.getId(), cc.getCompanyId(), cc.getDisplayName(), cc.getAddress(),
                        cc.getLatitude() == null ? null : cc.getLatitude().doubleValue(),
                        cc.getLongitude() == null ? null : cc.getLongitude().doubleValue(),
                        cc.getSido(), cc.getSigungu(), cc.getDong()
                )).toList();
    }
}
