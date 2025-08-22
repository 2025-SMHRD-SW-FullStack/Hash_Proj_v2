package com.meonjeo.meonjeo.auth;

import com.meonjeo.meonjeo.phone.PhoneAuthService;
import com.meonjeo.meonjeo.point.PointService;
import com.meonjeo.meonjeo.referral.ReferralService;
import com.meonjeo.meonjeo.user.User;
import com.meonjeo.meonjeo.user.UserService;
import com.meonjeo.meonjeo.user.dto.LoginRequest;
import com.meonjeo.meonjeo.user.dto.LoginResponse;
import com.meonjeo.meonjeo.user.dto.SignupRequest;
import com.meonjeo.meonjeo.user.dto.UserResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.DisabledException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.*;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.Optional;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
@Tag(name = "인증 API", description = "회원가입, 로그인, 토큰 발급/폐기")
public class AuthController {

    private static final String REFRESH_COOKIE = "refreshToken";
    private static final Duration REFRESH_TTL = Duration.ofDays(14);

    private final UserService userService;
    private final JwtTokenProvider jwtTokenProvider;
    private final AuthenticationManager authenticationManager;
    private final RefreshTokenRepository refreshTokenRepository;
    private final PhoneAuthService phoneAuthService;
    private final ReferralService referralService;
    private final PointService pointService;          // ✅ 생성자 주입(RequiredArgsConstructor)

    private boolean isWebClient(HttpServletRequest req) {
        String x = Optional.ofNullable(req.getHeader("X-Client")).orElse("web");
        return "web".equalsIgnoreCase(x);
    }

    private void setRefreshCookie(HttpServletRequest req, HttpServletResponse res, String token) {
        Cookie c = new Cookie(REFRESH_COOKIE, token);
        c.setHttpOnly(true);
        c.setPath("/");
        c.setMaxAge((int) REFRESH_TTL.toSeconds());
        boolean secure = !"localhost".equalsIgnoreCase(req.getServerName());
        c.setSecure(secure);
        res.addCookie(c);
        String sameSite = secure ? "None" : "Lax";
        String cookieHeader = String.format(
                "%s=%s; Max-Age=%d; Path=/; HttpOnly; %sSameSite=%s",
                REFRESH_COOKIE, token, (int) REFRESH_TTL.toSeconds(),
                secure ? "Secure; " : "", sameSite
        );
        res.addHeader("Set-Cookie", cookieHeader);
    }

    private void clearRefreshCookie(HttpServletRequest req, HttpServletResponse res) {
        boolean secure = !"localhost".equalsIgnoreCase(req.getServerName());
        String cookieHeader = String.format(
                "%s=; Max-Age=0; Path=/; HttpOnly; %sSameSite=%s",
                REFRESH_COOKIE,
                secure ? "Secure; " : "",
                secure ? "None" : "Lax"
        );
        res.addHeader("Set-Cookie", cookieHeader);
    }

    // ===================== 회원가입 =====================

    @PostMapping("/signup")
    @Operation(summary = "회원가입", description = "SMS 본인인증(짧은 토큰) 완료된 사용자만 가입 가능합니다.")
    @ApiResponse(responseCode = "200", description = "회원가입 성공")
    @ApiResponse(responseCode = "409", description = "이메일/전화번호 중복")
    @ApiResponse(responseCode = "403", description = "SMS 인증 미완료/만료")
    public ResponseEntity<?> signup(@RequestBody SignupRequest req) {
        // 1) SMS short token 검증
        if (!phoneAuthService.validateShortToken(req.getPhoneNumber(), req.getPhoneVerifyToken())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("PHONE_NOT_VERIFIED");
        }

        // 2) 중복 차단
        if (userService.existsByEmailOrPhone(req.getEmail(), req.getPhoneNumber())) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body("DUPLICATE_EMAIL_OR_PHONE");
        }

        // 3) 등록
        User user = userService.registerUser(req); // 내부에서 enabled=true & phoneVerified=true 처리

        // 4) 추천코드 처리: 추천인 찾기 → 자기 자신 아니면 추천인에게 포인트 지급 + referrer 저장(1회)
        if (StringUtils.hasText(req.getReferrer())) {
            referralService.findReferrerByCode(req.getReferrer()).ifPresent(referrer -> {
                if (!referrer.getId().equals(user.getId())) {
                    if (user.getReferrer() == null) {
                        user.setReferrer(req.getReferrer().trim().toUpperCase());
                        userService.save(user);
                    }
                    // ✅ 추천 가입 보상
                    pointService.awardReferralSignup(referrer.getId(), user.getId());
                }
            });
        }

        return ResponseEntity.ok(new UserResponse(user));
    }

    // ===================== 로그인 =====================

    @PostMapping("/login")
    @Operation(summary = "로그인", description = "이메일/비밀번호 기반 로그인 후 JWT 토큰 발급")
    @ApiResponse(responseCode = "200", description = "로그인 성공 - JWT 토큰 반환")
    public ResponseEntity<?> login(
            @RequestBody @Parameter(description = "이메일/비밀번호") LoginRequest request,
            HttpServletRequest httpRequest, HttpServletResponse response
    ) {
        Authentication auth;
        try {
            auth = authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(request.getEmail(), request.getPassword()));
        } catch (BadCredentialsException e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("INVALID_CREDENTIALS");
        } catch (DisabledException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("ACCOUNT_DISABLED");
        }

        User user = userService.findByEmail(request.getEmail())
                .orElseThrow(() -> new IllegalArgumentException("USER_NOT_FOUND"));

        if (!user.isEnabled() || !user.isPhoneVerified()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("PROFILE_INCOMPLETE");
        }

        String accessToken = jwtTokenProvider.createAccessToken(user.getId());
        String refreshToken = jwtTokenProvider.createRefreshToken(user.getId());

        // RefreshToken 저장 (PK=userId 방식)
        refreshTokenRepository.save(
                new RefreshToken(user.getId(), refreshToken, LocalDateTime.now().plusSeconds(REFRESH_TTL.toSeconds()))
        );

        boolean web = isWebClient(httpRequest);
        if (web) {
            setRefreshCookie(httpRequest, response, refreshToken);
            return ResponseEntity.ok(new LoginResponse(accessToken, null, new UserResponse(user)));
        } else {
            return ResponseEntity.ok(new LoginResponse(accessToken, refreshToken, new UserResponse(user)));
        }
    }

    // ===================== 로그아웃 =====================

    @PostMapping("/logout")
    @Operation(summary = "로그아웃", description = "RefreshToken 삭제 및 쿠키 제거")
    public ResponseEntity<?> logout(
            HttpServletRequest request,
            HttpServletResponse response,
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @RequestParam(value = "refreshToken", required = false) String refreshTokenInParam,
            @RequestBody(required = false) String refreshTokenInBody
    ) {
        String refreshToken = extractRefreshToken(request, authorization, refreshTokenInParam, refreshTokenInBody);
        if (refreshToken != null && jwtTokenProvider.validateToken(refreshToken)) {
            refreshTokenRepository.deleteByToken(refreshToken);
        }
        clearRefreshCookie(request, response);
        return ResponseEntity.ok("LOGOUT_OK");
    }

    private String extractRefreshToken(HttpServletRequest request,
                                       String authorization,
                                       String refreshTokenInParam,
                                       String refreshTokenInBody) {
        if (request.getCookies() != null) {
            for (Cookie c : request.getCookies()) {
                if (REFRESH_COOKIE.equals(c.getName()) && c.getValue() != null && !c.getValue().isBlank()) {
                    return c.getValue();
                }
            }
        }
        if (authorization != null && authorization.toLowerCase().startsWith("bearer ")) {
            return authorization.substring(7).trim();
        }
        if (refreshTokenInParam != null && !refreshTokenInParam.isBlank()) return refreshTokenInParam.trim();
        if (refreshTokenInBody != null && !refreshTokenInBody.isBlank()) return refreshTokenInBody.trim();
        return null;
    }
}
