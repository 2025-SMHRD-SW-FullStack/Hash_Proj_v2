package com.yjs_default.yjs_default.auth.oauth2;

import com.yjs_default.yjs_default.auth.JwtTokenProvider;
import com.yjs_default.yjs_default.auth.RefreshToken;
import com.yjs_default.yjs_default.auth.RefreshTokenRepository;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.web.authentication.AuthenticationSuccessHandler;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;
import java.time.LocalDateTime;

@Component
@RequiredArgsConstructor
public class CustomOAuth2SuccessHandler implements AuthenticationSuccessHandler {

    private final JwtTokenProvider jwtTokenProvider;
    private final RefreshTokenRepository refreshTokenRepository;

    @Override
    @Transactional
    public void onAuthenticationSuccess(HttpServletRequest request,
                                        HttpServletResponse response,
                                        Authentication authentication) throws IOException {
        try {
            CustomOAuth2User customUser = (CustomOAuth2User) authentication.getPrincipal();
            Long userId = customUser.getId();

            String accessToken = jwtTokenProvider.createAccessToken(userId); // 👈 이제 userId 넣기
            String refreshToken = jwtTokenProvider.createRefreshToken(userId);

            refreshTokenRepository.save(new RefreshToken(userId, refreshToken, LocalDateTime.now().plusDays(14)));

            Cookie cookie = new Cookie("refreshToken", refreshToken);
            cookie.setHttpOnly(true);
            cookie.setPath("/");
            cookie.setMaxAge(60 * 60 * 24 * 14);

            if (!request.getServerName().equals("localhost")) {
                cookie.setSecure(true); // ✅ HTTPS에서만 전송
            }

            response.addCookie(cookie);

            String redirectUrl = "http://localhost:5173/oauth-success?token=" + accessToken;
            response.sendRedirect(redirectUrl);

        } catch (Exception e) {
            e.printStackTrace();
            response.sendRedirect("/login?error=true");
        }
    }
}
