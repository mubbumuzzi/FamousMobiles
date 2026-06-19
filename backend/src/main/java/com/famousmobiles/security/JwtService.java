package com.famousmobiles.security;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Date;
import java.util.UUID;

import javax.crypto.SecretKey;

import org.springframework.stereotype.Component;

import com.famousmobiles.config.AppProperties;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;

@Component
public class JwtService {

    private final AppProperties appProperties;
    private final SecretKey accessKey;
    private final SecretKey refreshKey;

    public JwtService(AppProperties appProperties) {
        this.appProperties = appProperties;
        this.accessKey = Keys.hmacShaKeyFor(appProperties.jwt().secret().getBytes(StandardCharsets.UTF_8));
        this.refreshKey = Keys.hmacShaKeyFor(appProperties.jwt().refreshSecret().getBytes(StandardCharsets.UTF_8));
    }

    public String generateAccessToken(UUID userId, String mobile, String role) {
        Instant now = Instant.now();
        return Jwts.builder()
                .subject(userId.toString())
                .claim("mobile", mobile)
                .claim("role", role)
                .claim("type", "access")
                .issuedAt(Date.from(now))
                .expiration(Date.from(now.plusMillis(appProperties.jwt().accessTokenExpirationMs())))
                .signWith(accessKey)
                .compact();
    }

    public String generateRefreshToken(UUID userId) {
        Instant now = Instant.now();
        return Jwts.builder()
                .subject(userId.toString())
                .claim("type", "refresh")
                .id(UUID.randomUUID().toString())
                .issuedAt(Date.from(now))
                .expiration(Date.from(now.plusMillis(appProperties.jwt().refreshTokenExpirationMs())))
                .signWith(refreshKey)
                .compact();
    }

    public Claims parseAccessToken(String token) {
        Claims claims = Jwts.parser().verifyWith(accessKey).build().parseSignedClaims(token).getPayload();
        if (!"access".equals(claims.get("type"))) {
            throw new IllegalArgumentException("Invalid token type");
        }
        return claims;
    }

    public Claims parseRefreshToken(String token) {
        Claims claims = Jwts.parser().verifyWith(refreshKey).build().parseSignedClaims(token).getPayload();
        if (!"refresh".equals(claims.get("type"))) {
            throw new IllegalArgumentException("Invalid token type");
        }
        return claims;
    }
}
