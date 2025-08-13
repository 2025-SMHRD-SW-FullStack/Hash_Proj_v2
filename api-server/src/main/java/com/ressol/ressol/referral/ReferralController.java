package com.ressol.ressol.referral;

import com.ressol.ressol.auth.CustomUserDetails;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/me/referral")
@RequiredArgsConstructor
@Tag(name = "Referral", description = "추천 코드 API (최소)")
public class ReferralController {

    private final ReferralService referralService;

    @GetMapping("/code")
    @Operation(summary = "내 추천코드 조회 (없으면 발급)")
    public ResponseEntity<Map<String, String>> myCode(@AuthenticationPrincipal CustomUserDetails me) {
        String code = referralService.getOrIssueMyCode(me.getUserId());
        return ResponseEntity.ok(Map.of("code", code)); // DTO 없이 단순 JSON
    }
}
