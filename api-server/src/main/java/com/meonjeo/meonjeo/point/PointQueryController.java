package com.meonjeo.meonjeo.point;

import com.meonjeo.meonjeo.point.dto.*;
import com.meonjeo.meonjeo.security.AuthSupport;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.*;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Tag(name="포인트(마이페이지)")
@RestController
@RequestMapping("/api/me/points")
@RequiredArgsConstructor
public class PointQueryController {

    private final PointLedgerRepository ledgerRepo;
    private final PointRedemptionRepository redemptionRepo;
    private final AuthSupport auth;

    private Long currentUserId(){ return auth.currentUserId(); }

    @Operation(summary="내 포인트 잔액 조회")
    @GetMapping("/balance")
    public PointBalanceResponse balance(){
        int bal = ledgerRepo.sumBalance(currentUserId());
        return new PointBalanceResponse(bal);
    }

    @Operation(summary="내 포인트 원장 조회(페이지네이션, reason 필터 가능)")
    @GetMapping("/ledger")
    public PointLedgerPageResponse ledger(@RequestParam(defaultValue="0") int page,
                                          @RequestParam(defaultValue="10") int size,
                                          @RequestParam(required=false) String reason){
        Pageable pageable = PageRequest.of(Math.max(0,page), Math.min(100, size), Sort.by(Sort.Direction.DESC, "id"));
        var uid = currentUserId();
        Page<PointLedgerEntry> p = (reason == null || reason.isBlank())
                ? ledgerRepo.findByUserIdOrderByIdDesc(uid, pageable)
                : ledgerRepo.findByUserIdAndReasonOrderByIdDesc(uid, reason, pageable);

        List<PointLedgerItemResponse> items = p.getContent().stream().map(e ->
                new PointLedgerItemResponse(e.getId(), e.getAmount(), e.getReason(), e.getRefKey(), e.getCreatedAt())
        ).toList();

        return new PointLedgerPageResponse(items, p.getNumber(), p.getSize(), p.getTotalElements(), p.getTotalPages());
    }

    @Operation(summary="내 포인트 교환 내역(페이지네이션)")
    @GetMapping("/redemptions")
    public Page<RedemptionResponse> myRedemptions(@RequestParam(defaultValue="0") int page,
                                                  @RequestParam(defaultValue="10") int size){
        Pageable pageable = PageRequest.of(Math.max(0,page), Math.min(100,size));
        return redemptionRepo.findByUserIdOrderByIdDesc(currentUserId(), pageable)
                .map(PointRedemptionService::toDto);
    }
}
