package com.meonjeo.meonjeo.user;

import com.meonjeo.meonjeo.user.dto.AdminSanctionRequest;
import com.meonjeo.meonjeo.user.dto.AdminUserResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@Tag(name = "회원 관리(관리자)")
@RestController
@RequestMapping("/api/admin/users")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AdminUserController {

    private final UserService userService;

    @Operation(summary = "회원 목록 조회")
    @GetMapping
    public Page<AdminUserResponse> list(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) Role role,
            Pageable pageable) {
        return userService.adminSearchUsers(q, role, pageable);
    }

    @Operation(summary = "회원 제재 적용")
    @PostMapping("/{id}/sanction")
    public ResponseEntity<Void> sanction(
            @PathVariable Long id,
            @RequestBody AdminSanctionRequest req) {
        userService.adminSanctionUser(id, req.getSanctionUntil());
        return ResponseEntity.ok().build();
    }
}