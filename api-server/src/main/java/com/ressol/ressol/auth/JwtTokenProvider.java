package com.ressol.ressol.auth;

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

    private final long accessTokenValidityInMillis = 1000L * 60 * 10;           // 10분
    private final long refreshTokenValidityInMillis = 1000L * 60 * 60 * 24 * 14; // 14일

    private static final String HEADER = "Authorization";
    private static final String PREFIX = "Bearer ";

    @PostConstruct
    protected void init() {
        secretKey = Base64.getEncoder().encodeToString(secretKey.getBytes());
    }

    public String createAccessToken(Long userId) {
        return createToken(userId, accessTokenValidityInMillis);
    }

    public String createRefreshToken(Long userId) {
        return createToken(userId, refreshTokenValidityInMillis);
    }

    public long getRefreshTokenValidityInMillis() {
        return refreshTokenValidityInMillis;
    }

    public Date getRefreshTokenExpiryDate() {
        return new Date(System.currentTimeMillis() + refreshTokenValidityInMillis);
    }

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

    public String resolveToken(HttpServletRequest request) {
        String bearerToken = request.getHeader(HEADER);
        if (bearerToken != null && bearerToken.startsWith(PREFIX)) {
            return bearerToken.substring(PREFIX.length());
        }
        return null;
    }

    public boolean validateToken(String token) {
        try {
            Jwts.parser().setSigningKey(secretKey).parseClaimsJws(token);
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    public Long getUserId(String token) {
        String subject = Jwts.parser()
                .setSigningKey(secretKey)
                .parseClaimsJws(token)
                .getBody()
                .getSubject();
        return Long.parseLong(subject);
    }
}
