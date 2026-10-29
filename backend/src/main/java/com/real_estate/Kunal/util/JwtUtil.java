package com.real_estate.Kunal.util;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.security.Keys;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.security.Key;
import java.nio.charset.StandardCharsets;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;

@Component
public class JwtUtil {

    @Value("${jwt.secret}")
    private String secretKey;

    @Value("${jwt.expiration}")
    private long expiration;

    @Value("${jwt.issuer:realestate-guide}")
    private String issuer;

    @Value("${jwt.audience:realestate-clients}")
    private String audience;

    private Key getSignKey() {
        if (secretKey == null || secretKey.trim().length() < 32) {
            throw new IllegalStateException("JWT secret must be at least 32 characters.");
        }
        return Keys.hmacShaKeyFor(secretKey.getBytes(StandardCharsets.UTF_8));
    }

    public String generateToken(String email, String role, Long id) {
        return generateToken(email, role, id, 0L);
    }

    public String generateToken(String email, String role, Long id, Long tokenVersion) {

        Map<String, Object> claims = new HashMap<>();
        claims.put("role", role);
        claims.put("id", id);
        claims.put("purpose", "access");
        claims.put("tokenVersion", tokenVersion == null ? 0L : tokenVersion);

        return Jwts.builder()
                .setClaims(claims)
                .setSubject(email)
                .setIssuer(issuer)
                .setAudience(audience)
                .setIssuedAt(new Date())
                .setExpiration(new Date(System.currentTimeMillis() + expiration))
                .signWith(getSignKey(), SignatureAlgorithm.HS256)
                .compact();
    }

    public String generateTokenWithClaims(String subject, Map<String, Object> claims, long expiryMillis) {
        return Jwts.builder()
                .setClaims(claims)
                .setSubject(subject)
                .setIssuer(issuer)
                .setAudience(audience)
                .setIssuedAt(new Date())
                .setExpiration(new Date(System.currentTimeMillis() + expiryMillis))
                .signWith(getSignKey(), SignatureAlgorithm.HS256)
                .compact();
    }

    public Claims extractAllClaims(String token) {
        return Jwts.parserBuilder()
                .requireIssuer(issuer)
                .requireAudience(audience)
                .setAllowedClockSkewSeconds(60)
                .setSigningKey(getSignKey())
                .build()
                .parseClaimsJws(token)
                .getBody();
    }
    public String extractEmail(String token) {

        Claims claims = Jwts.parserBuilder()
                .requireIssuer(issuer)
                .requireAudience(audience)
                .setAllowedClockSkewSeconds(60)
                .setSigningKey(getSignKey())
                .build()
                .parseClaimsJws(token)
                .getBody();

        return claims.getSubject();
    }

    public boolean validateToken(String token) {

        try {
            Claims claims = extractAllClaims(token);
            return "access".equals(claims.get("purpose", String.class))
                    && claims.get("role", String.class) != null
                    && claims.getExpiration() != null && claims.getExpiration().after(new Date());
        } catch (Exception e) {
            return false;
        }
    }

    public boolean validateAccessToken(String token, com.real_estate.Kunal.Entity.User user) {
        if (user == null || !validateToken(token)) return false;
        try {
            Claims claims = extractAllClaims(token);
            Number version = claims.get("tokenVersion", Number.class);
            long currentVersion = user.getTokenVersion() == null ? 0L : user.getTokenVersion();
            return user.getEmail().equals(claims.getSubject())
                    && user.getRole().name().equals(claims.get("role", String.class))
                    && version != null && version.longValue() == currentVersion;
        } catch (Exception ex) {
            return false;
        }
    }

    public String extractRole(String token){

        Claims claims = Jwts.parserBuilder()
                .requireIssuer(issuer)
                .requireAudience(audience)
                .setAllowedClockSkewSeconds(60)
                .setSigningKey(getSignKey())
                .build()
                .parseClaimsJws(token)
                .getBody();

        return claims.get("role", String.class);
    }
}
