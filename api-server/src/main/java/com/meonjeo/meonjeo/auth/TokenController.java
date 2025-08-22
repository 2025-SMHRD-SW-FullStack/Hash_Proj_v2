package com.meonjeo.meonjeo.auth;

import com.meonjeo.meonjeo.auth.dto.TokenRequest;
import com.meonjeo.meonjeo.user.User;
import com.meonjeo.meonjeo.user.UserService;
import com.meonjeo.meonjeo.user.dto.LoginResponse;
import com.meonjeo.meonjeo.user.dto.UserResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
@Tag(name = "토큰 API", description = "AccessToken 재발급")
public class TokenController {

    private final JwtTokenProvider jwtTokenProvider;
    private final RefreshTokenRepository refreshTokenRepository;
    private final UserService userService;

    @PostMapping("/refresh")
    @Operation(summary = "AccessToken 재발급", description = "만료된 AccessToken을 RefreshToken으로 재발급합니다. (웹=쿠키, 앱=헤더/바디/쿼리)")
    public ResponseEntity<LoginResponse> refresh(
            HttpServletRequest request,
            HttpServletResponse response,
            @RequestParam(value = "refreshToken", required = false) String refreshTokenParam,
            @RequestBody(required = false) TokenRequest body // ✅ 여기로 수정
    ) {
        String refreshToken = null;
        boolean fromCookie = false;

        Cookie[] cookies = request.getCookies();
        if (cookies != null) {
            for (Cookie c : cookies) {
                if ("refreshToken".equals(c.getName()) && StringUtils.hasText(c.getValue())) {
                    refreshToken = c.getValue();
                    fromCookie = true;
                    break;
                }
            }
        }
        if (!StringUtils.hasText(refreshToken)) {
            String auth = request.getHeader("Authorization");
            if (StringUtils.hasText(auth) && auth.startsWith("Bearer ")) {
                refreshToken = auth.substring(7);
            }
        }
        if (!StringUtils.hasText(refreshToken) && StringUtils.hasText(refreshTokenParam)) {
            refreshToken = refreshTokenParam;
        }
        if (!StringUtils.hasText(refreshToken) && body != null && StringUtils.hasText(body.getRefreshToken())) {
            refreshToken = body.getRefreshToken();
        }
        if (!StringUtils.hasText(refreshToken)) {
            return ResponseEntity.status(401).build();
        }

        if (!jwtTokenProvider.validateToken(refreshToken)) {
            return ResponseEntity.status(401).build();
        }

        Long userId = jwtTokenProvider.getUserId(refreshToken);

        RefreshToken saved = refreshTokenRepository.findById(userId).orElse(null);
        if (saved == null || !refreshToken.equals(saved.getToken()) || saved.isExpired()) {
            return ResponseEntity.status(401).build();
        }

        String newAccessToken = jwtTokenProvider.createAccessToken(userId);
        String newRefreshToken = jwtTokenProvider.createRefreshToken(userId);

        LocalDateTime newExpiry = LocalDateTime.ofInstant(
                Instant.ofEpochMilli(jwtTokenProvider.getRefreshTokenExpiryDate().getTime()),
                ZoneId.systemDefault()
        );
        refreshTokenRepository.save(new RefreshToken(userId, newRefreshToken, newExpiry));

        String client = request.getHeader("X-Client");
        boolean isWeb = "web".equalsIgnoreCase(client) || (client == null && fromCookie);

        if (isWeb) {
            Cookie newCookie = new Cookie("refreshToken", newRefreshToken);
            newCookie.setHttpOnly(true);
            newCookie.setPath("/");
            newCookie.setMaxAge((int) (jwtTokenProvider.getRefreshTokenValidityInMillis() / 1000));
            if (!"localhost".equalsIgnoreCase(request.getServerName())) {
                newCookie.setSecure(true);
                response.addHeader("Set-Cookie",
                        String.format("refreshToken=%s; Path=/; Max-Age=%d; HttpOnly; Secure; SameSite=None",
                                newRefreshToken, (int) (jwtTokenProvider.getRefreshTokenValidityInMillis() / 1000)));
            } else {
                response.addCookie(newCookie);
            }
        }

        User user = userService.findById(userId);
        String bodyRefresh = isWeb ? null : newRefreshToken;
        return ResponseEntity.ok(new LoginResponse(newAccessToken, bodyRefresh, new UserResponse(user)));
    }
}
