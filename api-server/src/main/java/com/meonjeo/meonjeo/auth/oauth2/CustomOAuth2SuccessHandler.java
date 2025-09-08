package com.meonjeo.meonjeo.auth.oauth2;

import com.meonjeo.meonjeo.auth.JwtTokenProvider;
import com.meonjeo.meonjeo.auth.RefreshToken;
import com.meonjeo.meonjeo.auth.RefreshTokenRepository;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.security.web.authentication.AuthenticationSuccessHandler;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.io.IOException;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;

@Component
@RequiredArgsConstructor
public class CustomOAuth2SuccessHandler implements AuthenticationSuccessHandler {

    private final JwtTokenProvider jwtTokenProvider;
    private final RefreshTokenRepository refreshTokenRepository;

    // 성공 리다이렉트 URL (yml에 주입, 기본값 제공)

    @Value("${spring.security.oauth2.success.web-url:https://firsttry.smhrd.com/oauth-success}")
    private String webSuccessUrl;
    @Value("${spring.security.oauth2.success.app-url:firsttry://oauth-success}")
    private String appSuccessUrl;

    @Override
    @Transactional
    public void onAuthenticationSuccess(HttpServletRequest request,
                                        HttpServletResponse response,
                                        Authentication authentication) throws IOException {
        try {
            CustomOAuth2User principal = (CustomOAuth2User) authentication.getPrincipal();
            Long userId = principal.getId();

            // 토큰 발급
            String accessToken = jwtTokenProvider.createAccessToken(userId);
            String refreshToken = jwtTokenProvider.createRefreshToken(userId);

            // 리프레시 토큰 저장/회전 (PK=userId라 upsert)
            LocalDateTime expiresAt = LocalDateTime.ofInstant(
                    Instant.ofEpochMilli(jwtTokenProvider.getRefreshTokenExpiryDate().getTime()),
                    ZoneId.systemDefault()
            );
            refreshTokenRepository.save(new RefreshToken(userId, refreshToken, expiresAt));

            // 클라이언트 타입 결정: 우선순위 X-Client > mode 파라미터 > 기본(web)
            String clientHeader = request.getHeader("X-Client"); // "web" or "app"
            String modeParam = request.getParameter("mode");     // "web" or "app"
            boolean isApp = "app".equalsIgnoreCase(clientHeader) || "app".equalsIgnoreCase(modeParam);

            String targetUrl;
            if (isApp) {
                // 앱: 딥링크로 액세스/리프레시 둘 다 쿼리 전달
                String base = pickRedirectBase(request, appSuccessUrl);
                targetUrl = String.format("%s?accessToken=%s&refreshToken=%s", base, urlEncode(accessToken), urlEncode(refreshToken));
            } else {
                // 웹: 리프레시는 쿠키(HttpOnly), 바디에는 안 보냄. 액세스는 쿼리로 전달(기존 호환: token=)
                addRefreshCookie(request, response, refreshToken);
                String base = pickRedirectBase(request, webSuccessUrl);
                targetUrl = String.format("%s?token=%s", base, urlEncode(accessToken));
            }

            response.sendRedirect(targetUrl);

        } catch (Exception e) {
            e.printStackTrace();
            response.sendRedirect("/login?error=true");
        }
    }

    private void addRefreshCookie(HttpServletRequest request, HttpServletResponse response, String refreshToken) {
        Cookie cookie = new Cookie("refreshToken", refreshToken);
        cookie.setHttpOnly(true);
        cookie.setPath("/");
        cookie.setMaxAge((int) (jwtTokenProvider.getRefreshTokenValidityInMillis() / 1000));

        if (!"localhost".equalsIgnoreCase(request.getServerName())) {
            cookie.setSecure(true);
            // SameSite=None; Secure 가 필요한 경우 수동 헤더 추가 (서블릿 Cookie API는 SameSite 미지원)
            response.addHeader("Set-Cookie",
                    String.format("refreshToken=%s; Path=/; Max-Age=%d; HttpOnly; Secure; SameSite=None",
                            refreshToken, (int) (jwtTokenProvider.getRefreshTokenValidityInMillis() / 1000)));
            return;
        }
        response.addCookie(cookie);
    }

    private String pickRedirectBase(HttpServletRequest request, String defaultUrl) {
        // 선택적으로 ?redirect= 파라미터 허용 (화이트리스트 검증이 필요하면 여기 추가)
        String redirect = request.getParameter("redirect");
        return StringUtils.hasText(redirect) ? redirect : defaultUrl;
    }

    private String urlEncode(String v) {
        try {
            return java.net.URLEncoder.encode(v, java.nio.charset.StandardCharsets.UTF_8.name());
        } catch (Exception e) {
            return v;
        }
    }
}
