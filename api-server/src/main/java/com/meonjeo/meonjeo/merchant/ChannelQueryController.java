package com.meonjeo.meonjeo.merchant;

import com.meonjeo.meonjeo.merchant.dto.NearbyChannelResponse;
import com.meonjeo.meonjeo.merchant.dto.RegionChannelResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Tag(name="채널 조회(OFFLINE)", description="가까운 가게/지역별 가게 조회")
@RestController
@RequestMapping("/api/channels")
@RequiredArgsConstructor
public class ChannelQueryController {

    private final ChannelQueryService service;

    @Operation(summary="내 주변 오프라인 가게(거리순)")
    @GetMapping("/nearby")
    public ResponseEntity<List<NearbyChannelResponse>> nearby(
            @RequestParam double lat,
            @RequestParam double lng,
            @RequestParam(defaultValue = "5") double radiusKm,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        return ResponseEntity.ok(service.findNearby(lat, lng, radiusKm, page, size));
    }

    @Operation(summary="지역(시/구) 기준 가게 목록 - 동 가나다순")
    @GetMapping("/region")
    public ResponseEntity<List<RegionChannelResponse>> byRegion(
            @RequestParam String sido,
            @RequestParam String sigungu,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size
    ) {
        return ResponseEntity.ok(service.findByRegion(sido, sigungu, page, size));
    }
}
