package com.meonjeo.meonjeo.user;

import com.meonjeo.meonjeo.auth.CustomUserDetails;
import com.meonjeo.meonjeo.user.dto.AccountDeletionRequest;
import com.meonjeo.meonjeo.user.dto.MyPageResponse;
import com.meonjeo.meonjeo.user.dto.UserResponse;
import com.meonjeo.meonjeo.user.dto.UserUpdateRequest;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
@Tag(name = "회원 API", description = "회원 정보 조회/수정, 마이페이지")
public class UserController {

    private final UserService userService;
    private final AccountDeletionService accountDeletionService;

    @SecurityRequirement(name = "bearerAuth")
    @GetMapping("/me")
    @Operation(summary = "현재 사용자 정보 조회", description = "AccessToken으로 본인 정보를 반환합니다.")
    @ApiResponse(responseCode = "200", description = "조회 성공")
    public ResponseEntity<UserResponse> getCurrentUser(
            @Parameter(hidden = true) @AuthenticationPrincipal CustomUserDetails me) {

        User user = userService.findById(me.getUser().getId());
        return ResponseEntity.ok(new UserResponse(user));
    }

    @SecurityRequirement(name = "bearerAuth")
    @PutMapping("/me")
    @Operation(summary = "회원정보 수정", description = "네이버닉/주소/지역/생일/성별/리뷰URL/전화번호(본인인증 필요) 수정")
    @ApiResponse(responseCode = "200", description = "수정 성공")
    public ResponseEntity<UserResponse> updateUserInfo(
            @Parameter(hidden = true) @AuthenticationPrincipal CustomUserDetails me,
            @RequestBody UserUpdateRequest request) {

        User updated = userService.updateUserInfo(me.getUser().getEmail(), request);
        return ResponseEntity.ok(new UserResponse(updated));
    }

    @SecurityRequirement(name = "bearerAuth")
    @GetMapping("/mypage")
    @Operation(summary = "마이페이지 조회", description = "마이페이지용 상세 정보를 반환합니다.")
    @ApiResponse(responseCode = "200", description = "조회 성공")
    public ResponseEntity<MyPageResponse> getMyPage(
            @Parameter(hidden = true) @AuthenticationPrincipal CustomUserDetails me) {

        User user = userService.findById(me.getUser().getId());
        return ResponseEntity.ok(new MyPageResponse(user));
    }

    @SecurityRequirement(name = "bearerAuth")
    @PostMapping("/me/delete")
    @Operation(
            summary = "회원탈퇴(하드 딜리트)",
            description = "LOCAL: 비밀번호 확인 필요 / SOCIAL: 확인 문구 '탈퇴합니다' 필요"
    )
    public ResponseEntity<Void> deleteMe(
            @Parameter(hidden = true) @AuthenticationPrincipal CustomUserDetails me,
            @RequestBody @jakarta.validation.Valid AccountDeletionRequest request
    ) {
        accountDeletionService.deleteMe(me.getUser().getId(), request);
        return ResponseEntity.ok().build();
    }
}
