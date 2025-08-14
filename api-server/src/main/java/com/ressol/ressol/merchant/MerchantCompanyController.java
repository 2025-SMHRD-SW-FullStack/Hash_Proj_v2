package com.ressol.ressol.merchant;

import com.ressol.ressol.merchant.dto.CompanyDto;
import com.ressol.ressol.merchant.dto.CompanyUpsertRequest;
import com.ressol.ressol.security.AuthSupport;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/merchant/companies/me")
@SecurityRequirement(name = "bearerAuth")
@RequiredArgsConstructor
@Tag(name = "사장 · 회사", description = "사장 온보딩 및 회사 정보")
public class MerchantCompanyController {

    private final CompanyService service;
    private final AuthSupport auth;

    @Operation(summary = "내 회사 등록/수정 (사장 온보딩)")
    @PostMapping
    public ResponseEntity<CompanyDto> upsert(@Valid @RequestBody CompanyUpsertRequest req){
        Long me = auth.currentUserId();
        return ResponseEntity.ok(service.upsertMyCompany(me, req));
    }

    @Operation(summary = "내 회사 조회")
    @GetMapping
    public ResponseEntity<CompanyDto> get(){
        Long me = auth.currentUserId();
        return ResponseEntity.ok(service.getMyCompany(me));
    }
}
