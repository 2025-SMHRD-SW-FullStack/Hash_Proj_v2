package com.meonjeo.meonjeo.seller;

import com.meonjeo.meonjeo.seller.dto.SellerDecisionRequest;
import com.meonjeo.meonjeo.seller.dto.SellerProfileResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.*;
import org.springframework.web.bind.annotation.*;

@Tag(name = "셀러 승급(관리자)")
@RestController
@RequestMapping("/api/admin/seller-applications")
@RequiredArgsConstructor
public class SellerAdminController {

    private final SellerService service;

    @Operation(summary = "신청 목록(검색)")
    @GetMapping
    public Page<SellerProfileResponse> list(@RequestParam(required=false) SellerStatus status,
                                            @RequestParam(required=false) String q,
                                            @RequestParam(defaultValue="0") int page,
                                            @RequestParam(defaultValue="20") int size){
        Pageable pageable = PageRequest.of(Math.max(0,page), Math.min(100,size));
        return service.adminSearch(status, q, pageable);
    }

    @Operation(summary = "신청 상세")
    @GetMapping("/{id}")
    public SellerProfileResponse get(@PathVariable Long id){
        return service.adminGet(id);
    }

    @Operation(summary = "승인")
    @PostMapping("/{id}/approve")
    public SellerProfileResponse approve(@PathVariable Long id, @RequestBody(required = false) SellerDecisionRequest body){
        return service.approve(id, body != null ? body.memo() : null);
    }

    @Operation(summary = "거절")
    @PostMapping("/{id}/reject")
    public SellerProfileResponse reject(@PathVariable Long id, @RequestBody(required = false) SellerDecisionRequest body){
        return service.reject(id, body != null ? body.memo() : null);
    }
}
