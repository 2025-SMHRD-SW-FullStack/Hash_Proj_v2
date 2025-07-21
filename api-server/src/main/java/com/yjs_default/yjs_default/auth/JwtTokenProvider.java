package com.yjs_default.yjs_default.auth;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import jakarta.annotation.PostConstruct;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.util.Base64;
import java.util.Date;

@Component
public class JwtTokenProvider {

    @Value("${jwt.secret}")
    private String secretKey;

    // 각각 유효시간 (초 단위 → 밀리초로 변환)
    private final long accessTokenValidityInMillis = 1000L * 60 * 10;    // 10분

    private final long refreshTokenValidityInMillis = 1000L * 60 * 60 * 24 * 14; // 14일

    private static final String HEADER = "Authorization";
    private static final String PREFIX = "Bearer ";

    @PostConstruct
    protected void init() {
        secretKey = Base64.getEncoder().encodeToString(secretKey.getBytes());
    }

    // ✅ AccessToken 발금
    public String createAccessToken(Long userId) {return createToken(userId, accessTokenValidityInMillis);}

    // ✅ RefreshToken 발금
    public String createRefreshToken(Long userId) {return createToken(userId, refreshTokenValidityInMillis);}

    // 해결: AccessToken vs RefreshToken 발금 구분을 위한 특정 키 추가
    public long getRefreshTokenValidityInMillis() {
        return refreshTokenValidityInMillis;
    }

    // 해결: RefreshToken 유효시간 리턴 (새 발금 시 모두 같은 시간 설정하기 위해)
    public Date getRefreshTokenExpiryDate() {
        return new Date(System.currentTimeMillis() + refreshTokenValidityInMillis);
    }

    // 해결: 공통 토큰 생성 메서드
    private String createToken(Long userId, long validityInMillis) {
        Claims claims = Jwts.claims().setSubject(String.valueOf(userId));
        Date now = new Date();
        Date expiry = new Date(now.getTime() + validityInMillis);

        return Jwts.builder()
                .setClaims(claims)
                .setIssuedAt(now)
                .setExpiration(expiry)
                .signWith(SignatureAlgorithm.HS256, secretKey)
                .compact();
    }

    // ✅ 요청 헤더에서 JWT 토큰 추출
    public String resolveToken(HttpServletRequest request) {
        String bearerToken = request.getHeader(HEADER);
        if (bearerToken != null && bearerToken.startsWith(PREFIX)) {
            return bearerToken.substring(PREFIX.length());
        }
        return null;
    }

    // ✅ 토큰 유효성 검사
    public boolean validateToken(String token) {
        try {
            Jwts.parser().setSigningKey(secretKey).parseClaimsJws(token);
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    // ✅ 토큰에서 유저 ID 추출
    public Long getUserId(String token) {
        String subject = Jwts.parser()
                .setSigningKey(secretKey)
                .parseClaimsJws(token)
                .getBody()
                .getSubject();
        return Long.parseLong(subject); // ✅ Long으로 변환해서 리턴
    }
}
