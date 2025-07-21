package com.yjs_default.yjs_default.user;

import com.yjs_default.yjs_default.company.CompanyService;
import com.yjs_default.yjs_default.company.dto.CompanyResponse;
import com.yjs_default.yjs_default.company.dto.CompanyUpdateRequest;
import com.yjs_default.yjs_default.user.dto.MyPageResponse;
import com.yjs_default.yjs_default.user.dto.UserResponse;
import com.yjs_default.yjs_default.user.dto.UserUpdateRequest;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
@Tag(name = "회원 API", description = "회원 정보 조회, 마이페이지, 닉네임 수정 등 유저 관련 API")
public class UserController {

    private final UserService userService;
    private final CompanyService companyService;

    /**
     * 현재 로그인한 사용자 정보 조회 //
     * ✅ 최소 유저 정보
     * ex) 홍길동님 환영합니다!
     */
    @GetMapping("/me")
    @Operation(summary = "현재 사용자 정보 조회", description = "AccessToken 기반으로 로그인한 사용자의 정보를 반환합니다.")
    @ApiResponse(responseCode = "200", description = "사용자 정보 조회 성공")
    public ResponseEntity<UserResponse> getCurrentUser(
            @Parameter(hidden = true) @AuthenticationPrincipal UserDetails userDetails) {

        String email = userDetails.getUsername();
        User user = userService.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("사용자 정보를 찾을 수 없습니다."));

        return ResponseEntity.ok(new UserResponse(user));
    }

    /**
     * 사용자 정보 수정
     */
    @SecurityRequirement(name = "bearerAuth")
    @PutMapping("/me")
    @Operation(summary = "회원정보 수정", description = "현재 로그인한 사용자의 닉네임, 이름, 전화번호, 생년월일을 수정합니다.")
    @ApiResponse(responseCode = "200", description = "회원정보 수정 성공")
    public ResponseEntity<UserResponse> updateUserInfo(
            @Parameter(hidden = true) @AuthenticationPrincipal UserDetails userDetails,
            @RequestBody UserUpdateRequest request) {

        String email = userDetails.getUsername();
        User updatedUser = userService.updateUserInfo(email, request);
        return ResponseEntity.ok(new UserResponse(updatedUser));
    }

    /**
     * 마이페이지 정보 조회 //
     * ✅ 마이페이지용 응답
     * ex) 내가 작성한 게시글
     */
    @SecurityRequirement(name = "bearerAuth")
    @GetMapping("/mypage")
    @Operation(summary = "마이페이지 조회", description = "현재 로그인한 사용자의 마이페이지 정보를 반환합니다.")
    @ApiResponse(responseCode = "200", description = "마이페이지 정보 조회 성공")
    public ResponseEntity<MyPageResponse> getMyPage(
            @Parameter(hidden = true) @AuthenticationPrincipal UserDetails userDetails) {

        String email = userDetails.getUsername();
        User user = userService.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("사용자 정보를 찾을 수 없습니다."));

        return ResponseEntity.ok(new MyPageResponse(user));
    }

    @SecurityRequirement(name = "bearerAuth")
    @Operation(summary = "회사 정보 조회", description = "현재 로그인한 사용자의 회사 정보를 조회합니다.")
    @GetMapping("/company")
    public ResponseEntity<CompanyResponse> getCompanyInfo(
            @Parameter(hidden = true) @AuthenticationPrincipal UserDetails userDetails) {

        String email = userDetails.getUsername();
        CompanyResponse companyInfo = companyService.getCompanyInfoByUserEmail(email);
        return ResponseEntity.ok(companyInfo);
    }

    @SecurityRequirement(name = "bearerAuth")
    @Operation(summary = "회사 정보 수정", description = "현재 로그인한 사용자의 회사 정보를 수정합니다.")
    @PutMapping("/company")
    public ResponseEntity<CompanyResponse> updateCompanyInfo(
            @Parameter(hidden = true) @AuthenticationPrincipal UserDetails userDetails,
            @RequestBody CompanyUpdateRequest request) {

        String email = userDetails.getUsername();
        User user = userService.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("사용자 정보 없음"));
        CompanyResponse updated = companyService.updateCompanyInfo(user, request);
        return ResponseEntity.ok(updated);
    }

}
