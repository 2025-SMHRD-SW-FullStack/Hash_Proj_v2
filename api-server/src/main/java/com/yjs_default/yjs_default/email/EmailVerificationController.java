package com.yjs_default.yjs_default.email;

import com.yjs_default.yjs_default.email.dto.EmailRequest;
import com.yjs_default.yjs_default.exception.EmailTokenException;
import com.yjs_default.yjs_default.exception.UserNotFoundException;
import com.yjs_default.yjs_default.user.UserRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/email")
@RequiredArgsConstructor
@Tag(name = "이메일 인증 API", description = "이메일 인증 링크 발송 및 검증")
public class EmailVerificationController {

    private final EmailVerificationService emailVerificationService;
    private final EmailSenderService emailSenderService;
    private final UserRepository userRepository;

    @PostMapping("/send")
    @Operation(summary = "이메일 인증 요청", description = "입력한 이메일로 인증 링크를 전송합니다.")
    public ResponseEntity<String> sendEmailVerification(@RequestBody EmailRequest request) {
        // 유저 존재 여부 검사 (회원가입용이 아니라면 생략 가능)
        if (userRepository.existsByEmail(request.getEmail())) {
            return ResponseEntity.badRequest().body("이미 사용 중인 이메일입니다.");
        }

        EmailVerificationToken token = emailVerificationService.createVerificationToken(request.getEmail());
        emailSenderService.sendVerificationEmail(request.getEmail(), token.getToken());

        return ResponseEntity.ok("인증 메일이 전송되었습니다.");
    }

    @GetMapping("/verify")
    @Operation(summary = "이메일 인증 확인", description = "전송된 인증 링크를 통해 계정을 인증합니다.")
    public ResponseEntity<String> verifyEmail(@RequestParam("token") String token) {
        try {
            emailVerificationService.verifyToken(token);
            return ResponseEntity.ok("이메일 인증이 완료되었습니다.");
        } catch (EmailTokenException | UserNotFoundException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }
}
