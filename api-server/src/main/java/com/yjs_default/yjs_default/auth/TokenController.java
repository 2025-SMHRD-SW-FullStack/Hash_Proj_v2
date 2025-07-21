package com.yjs_default.yjs_default.auth;

import com.yjs_default.yjs_default.user.User;
import com.yjs_default.yjs_default.user.UserService;
import com.yjs_default.yjs_default.user.dto.LoginResponse;
import com.yjs_default.yjs_default.user.dto.UserResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDateTime;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
@Tag(name = "토큰 API", description = "AccessToken 재발급")
public class TokenController {

    private final JwtTokenProvider jwtTokenProvider;
    private final RefreshTokenRepository refreshTokenRepository;
    private final UserService userService;

    @PostMapping("/refresh")
    @Operation(summary = "AccessToken 재발급", description = "만료된 AccessToken을 RefreshToken을 이용해 재발급합니다.")
    public ResponseEntity<LoginResponse> refresh(HttpServletRequest request, HttpServletResponse response) {
        // 1. 쿠키에서 refreshToken 추출
        String refreshToken = null;
        Cookie[] cookies = request.getCookies();
        if (cookies != null) {
            for (Cookie cookie : cookies) {
                if ("refreshToken".equals(cookie.getName())) {
                    refreshToken = cookie.getValue();
                    break;
                }
            }
        }

        if (refreshToken == null) return ResponseEntity.status(401).build();

        // 2. 토큰 유효성 검사
        if (!jwtTokenProvider.validateToken(refreshToken)) {
            return ResponseEntity.status(401).build();
        }

        // 3. 토큰에서 userId(PK) 추출
        Long userId = jwtTokenProvider.getUserId(refreshToken);  // subject를 Long으로 파싱

        // 4. DB의 refreshToken과 일치하는지 확인
        RefreshToken savedToken = refreshTokenRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("저장된 리프레시 토큰이 없습니다."));

        if (!savedToken.getToken().equals(refreshToken) || savedToken.isExpired()) {
            return ResponseEntity.status(401).build();
        }

        // 5. 새 토큰 발급
        String newAccessToken = jwtTokenProvider.createAccessToken(userId);
        String newRefreshToken = jwtTokenProvider.createRefreshToken(userId);

        // 6. DB 갱신
        RefreshToken newToken = new RefreshToken(userId, newRefreshToken, LocalDateTime.now().plusDays(14));
        refreshTokenRepository.save(newToken);

        // 7. 쿠키 갱신
        Cookie newCookie = new Cookie("refreshToken", newRefreshToken);
        newCookie.setHttpOnly(true);
        newCookie.setPath("/");
        newCookie.setMaxAge(60 * 60 * 24 * 14);

        if (!request.getServerName().equals("localhost")) {
            newCookie.setSecure(true); // ✅ HTTPS에서만 전송
        }

        response.addCookie(newCookie);

        // 8. 유저 정보 응답
        User user = userService.findById(userId);

        return ResponseEntity.ok(new LoginResponse(newAccessToken, new UserResponse(user)));
    }
}