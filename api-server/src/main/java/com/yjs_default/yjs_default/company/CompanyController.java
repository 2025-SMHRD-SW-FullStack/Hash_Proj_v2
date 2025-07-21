package com.yjs_default.yjs_default.company;

import com.yjs_default.yjs_default.company.dto.CompanyResponse;
import com.yjs_default.yjs_default.company.dto.CompanyUpdateRequest;
import com.yjs_default.yjs_default.user.User;
import com.yjs_default.yjs_default.user.UserService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.Parameter;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/company")
@RequiredArgsConstructor
@Tag(name = "회사 API", description = "회사 정보 조회 및 수정")
public class CompanyController {

    private final CompanyService companyService;
    private final UserService userService;

    @SecurityRequirement(name = "bearerAuth")
    @GetMapping("/me")
    @Operation(summary = "내 회사 정보 조회", description = "현재 로그인한 사용자의 회사 정보를 조회합니다.")
    @ApiResponse(responseCode = "200", description = "회사 정보 조회 성공")
    public ResponseEntity<CompanyResponse> getMyCompanyInfo(
            @Parameter(hidden = true) @AuthenticationPrincipal UserDetails userDetails) {

        User user = userService.getUserFromPrincipal(userDetails);
        CompanyResponse response = companyService.getCompanyInfo(user);
        return ResponseEntity.ok(response);
    }

    @SecurityRequirement(name = "bearerAuth")
    @PutMapping("/me")
    @Operation(summary = "내 회사 정보 수정", description = "현재 로그인한 사용자의 회사 정보를 수정합니다.")
    @ApiResponse(responseCode = "200", description = "회사 정보 수정 성공")
    public ResponseEntity<CompanyResponse> updateMyCompanyInfo(
            @Parameter(hidden = true) @AuthenticationPrincipal UserDetails userDetails,
            @RequestBody CompanyUpdateRequest request) {

        User user = userService.getUserFromPrincipal(userDetails);
        CompanyResponse response = companyService.updateCompanyInfo(user, request);
        return ResponseEntity.ok(response);
    }
}
