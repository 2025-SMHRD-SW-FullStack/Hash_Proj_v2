package com.ressol.ressol.phone;

import com.ressol.ressol.auth.dto.PhoneVerifyTokenResponse;
import com.ressol.ressol.phone.dto.PhoneSendRequest;
import com.ressol.ressol.phone.dto.PhoneVerifyRequest;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth/phone")
@RequiredArgsConstructor
@Tag(name = "문자 인증", description = "휴대폰 본인 인증 전송/검증")
public class PhoneAuthController {
    private final PhoneAuthService phoneAuthService;

    @PostMapping("/send")
    @Operation(summary = "인증번호 전송(3분 유효)")
    public ResponseEntity<Void> send(@RequestBody PhoneSendRequest req) {
        phoneAuthService.sendCode(req.getPhoneNumber());
        return ResponseEntity.ok().build();
    }

    @PostMapping("/verify")
    @Operation(summary = "인증번호 검증 → 단기 토큰 발급(10분 유효)")
    public ResponseEntity<PhoneVerifyTokenResponse> verify(@RequestBody PhoneVerifyRequest req) {
        String token = phoneAuthService.verifyCodeAndIssueToken(req.getPhoneNumber(), req.getCode());
        return ResponseEntity.ok(new PhoneVerifyTokenResponse(token));
    }
}
