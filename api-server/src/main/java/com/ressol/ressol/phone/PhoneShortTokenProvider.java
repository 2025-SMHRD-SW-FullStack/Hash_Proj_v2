package com.ressol.ressol.phone;

import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;
import java.util.Date;

@Component
public class PhoneShortTokenProvider {
    private final byte[] secret;
    private final long validityMillis;

    public PhoneShortTokenProvider(
            @Value("${jwt.secret}") String secretKey,
            @Value("${phone.short-token.validity-seconds:600}") long validitySeconds
    ) {
        this.secret = secretKey.getBytes(StandardCharsets.UTF_8);
        this.validityMillis = validitySeconds * 1000L;
    }

    public String issue(String phoneE164) {
        long now = System.currentTimeMillis();
        return Jwts.builder()
                .setSubject(phoneE164)
                .claim("type", "phone_verify")
                .setIssuedAt(new Date(now))
                .setExpiration(new Date(now + validityMillis))
                .signWith(SignatureAlgorithm.HS256, secret)
                .compact();
    }

    public boolean validate(String phoneE164, String token) {
        try {
            var claims = Jwts.parser().setSigningKey(secret).parseClaimsJws(token).getBody();
            return "phone_verify".equals(claims.get("type")) && phoneE164.equals(claims.getSubject());
        } catch (Exception e) { return false; }
    }
}
