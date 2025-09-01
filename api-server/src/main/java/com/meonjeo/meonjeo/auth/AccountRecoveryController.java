package com.meonjeo.meonjeo.auth;

import com.meonjeo.meonjeo.auth.dto.FindIdRequest;
import com.meonjeo.meonjeo.auth.dto.FindIdResponse;
import com.meonjeo.meonjeo.auth.dto.PasswordResetRequest;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth/recovery")
@RequiredArgsConstructor
@Tag(name = "계정 찾기/재설정", description = "아이디 찾기, 비밀번호 재설정")
public class AccountRecoveryController {

    private final AccountRecoveryService service;

    @PostMapping("/id")
    @Operation(summary = "아이디(이메일) 찾기", description = "문자인증(단기토큰) 성공 시, 해당 전화번호로 가입된 로컬계정의 이메일을 반환")
    public ResponseEntity<FindIdResponse> findId(@Valid @RequestBody FindIdRequest req) {
        return ResponseEntity.ok(service.findId(req));
    }

    @PostMapping("/password")
    @Operation(summary = "비밀번호 재설정", description = "아이디+문자인증 검증 후, 새 비밀번호로 교체(모든 세션 무효화)")
    public ResponseEntity<Void> resetPassword(@Valid @RequestBody PasswordResetRequest req) {
        service.resetPassword(req);
        return ResponseEntity.ok().build();
    }
}
