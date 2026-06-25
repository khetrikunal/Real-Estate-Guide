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

        Map<String, Object> claims = new HashMap<>();
        claims.put("role", role);
        claims.put("id", id);

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
            return claims.getExpiration() != null && claims.getExpiration().after(new Date());
        } catch (Exception e) {
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
