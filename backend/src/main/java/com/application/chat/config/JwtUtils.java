package com.application.chat.config;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.util.Date;

@Component
public class JwtUtils {

    private final SecretKey secretKey;
    private final long expirationMs;

    public JwtUtils(@Value("${jwt.secret}") String secret,
                    @Value("${jwt.expiration-ms}") long expirationMs) {
        if (secret.length() < 64) {
            throw new IllegalArgumentException("JWT secret must be at least 64 characters for HS512 algorithm.");
        }
        this.secretKey = Keys.hmacShaKeyFor(secret.getBytes());
        this.expirationMs = expirationMs;
    }

    // ✅ Generate token with USERNAME instead of email
    public String generateJwtToken(String username) {
        return Jwts.builder()
                .setSubject(username) // 🔥 store username, not email
                .setIssuedAt(new Date())
                .setExpiration(new Date(System.currentTimeMillis() + expirationMs))
                .signWith(secretKey, SignatureAlgorithm.HS512)
                .compact();
    }

    public boolean validateJwtToken(String token) {
        try {
            Jwts.parserBuilder().setSigningKey(secretKey).build().parseClaimsJws(token);
            return true;
        } catch (Exception e) {
            System.err.println("JWT validation failed: " + e.getMessage());
        }
        return false;
    }

    public String getUsernameFromJwtToken(String token) {
        Claims claims = Jwts.parserBuilder()
                .setSigningKey(secretKey)
                .build()
                .parseClaimsJws(token)
                .getBody();
        return claims.getSubject();
    }

    public Claims getClaimsFromJwtToken(String token) {
        return Jwts.parserBuilder()
                .setSigningKey(secretKey)
                .build()
                .parseClaimsJws(token)
                .getBody();
    }

    public SecretKey getSecretKey() {
        return secretKey;
    }

    // Backward-compatible helper
    public String extractUsername(String token) {
        return getUsernameFromJwtToken(token);
    }
}
