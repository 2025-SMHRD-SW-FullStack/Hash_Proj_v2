package com.meonjeo.meonjeo.point;

import com.meonjeo.meonjeo.point.dto.*;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@Tag(name="포인트 교환")
@RestController
@RequiredArgsConstructor
public class PointCommandController {

    private final PointRedemptionService redemptionService;
    private final PointRedemptionRepository redemptionRepo;

    @Operation(summary="포인트 교환 요청(5천/1만/3만, 잔액 락 처리)")
    @PreAuthorize("isAuthenticated()")
    @PostMapping("/api/me/points/redemptions")
    public RedemptionResponse request(@RequestBody @Valid RedemptionCreateRequest req){
        return redemptionService.request(req.amount());
    }

    // ===== 관리자 =====

    @Operation(summary="[관리자] 교환 요청 목록(상태/검색)")
    @PreAuthorize("hasRole('ADMIN')")
    @GetMapping("/api/admin/points/redemptions")
    public Page<AdminRedemptionItem> list(
            @RequestParam(required = false) RedemptionStatus status, // null이면 전체
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String q // 닉네임 검색은 User join 필요
    ) {
        var pageable = PageRequest.of(Math.max(0, page), Math.min(100, size));
        // ✅ 닉네임 조인 + 상태/검색 필터가 포함된 커스텀 쿼리 사용
        return redemptionRepo.searchAdminList(status, q, pageable);
    }

    @Operation(summary="[관리자] 교환 승인")
    @PreAuthorize("hasRole('ADMIN')")
    @PostMapping("/api/admin/points/redemptions/{id}/approve")
    public RedemptionResponse approve(@PathVariable Long id){
        return redemptionService.approve(id);
    }

    @Operation(summary="[관리자] 교환 반려(락 해제)")
    @PreAuthorize("hasRole('ADMIN')")
    @PostMapping("/api/admin/points/redemptions/{id}/reject")
    public RedemptionResponse reject(@PathVariable Long id){
        return redemptionService.reject(id);
    }
}
