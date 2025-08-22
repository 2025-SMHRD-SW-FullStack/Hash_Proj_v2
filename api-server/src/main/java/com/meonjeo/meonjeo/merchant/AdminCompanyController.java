package com.meonjeo.meonjeo.merchant;

import com.meonjeo.meonjeo.merchant.dto.CompanyDto;
import com.meonjeo.meonjeo.merchant.dto.RejectRequest;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springdoc.core.annotations.ParameterObject;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/admin/companies")
@SecurityRequirement(name = "bearerAuth")
@RequiredArgsConstructor
@Tag(name = "관리자 · 회사", description = "회사 심사/승인/반려 관리")
public class AdminCompanyController {

    private final CompanyService service;

    @Operation(summary = "회사 목록(상태별)")
    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public Page<CompanyDto> list(@RequestParam(required = false) Company.Status status,
                                 @ParameterObject Pageable pageable){
        return service.list(status, pageable);
    }

    @Operation(summary = "회사 승인")
    @PostMapping("/{id}/approve")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> approve(@PathVariable Long id){
        service.approve(id);
        return ResponseEntity.ok().build();
    }

    @Operation(summary = "회사 반려")
    @PostMapping("/{id}/reject")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> reject(@PathVariable Long id, @RequestBody RejectRequest req){
        service.reject(id, req.reason());
        return ResponseEntity.ok().build();
    }
}
