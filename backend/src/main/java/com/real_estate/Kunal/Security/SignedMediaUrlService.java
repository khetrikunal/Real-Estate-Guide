package com.real_estate.Kunal.Security;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.util.UriComponentsBuilder;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.util.HexFormat;

@Service
public class SignedMediaUrlService {

    private final String secret;
    private final long ttlSeconds;

    public SignedMediaUrlService(
            @Value("${app.security.media-url-secret:${jwt.secret}}") String secret,
            @Value("${app.security.media-url-ttl-seconds:43200}") long ttlSeconds) {
        this.secret = secret;
        this.ttlSeconds = ttlSeconds;
    }

    public String signPath(String rawPath) {
        String path = canonicalPath(rawPath);
        if (path == null || path.isBlank()) {
            return rawPath;
        }
        long expiresAt = Instant.now().getEpochSecond() + Math.max(ttlSeconds, 300);
        String signature = sign(path, expiresAt);
        return UriComponentsBuilder.fromPath(path)
                .queryParam("exp", expiresAt)
                .queryParam("sig", signature)
                .build()
                .toUriString();
    }

    public boolean isValid(String rawPath, Long expiresAt, String signature) {
        String path = canonicalPath(rawPath);
        if (path == null || path.isBlank() || expiresAt == null || signature == null || signature.isBlank()) {
            return false;
        }
        if (expiresAt < Instant.now().getEpochSecond()) {
            return false;
        }
        String expected = sign(path, expiresAt);
        return MessageDigest.isEqual(
                expected.getBytes(StandardCharsets.UTF_8),
                signature.getBytes(StandardCharsets.UTF_8)
        );
    }

    public String canonicalPath(String rawPath) {
        if (rawPath == null) {
            return null;
        }
        String trimmed = rawPath.trim();
        if (trimmed.isEmpty()) {
            return trimmed;
        }
        try {
            URI uri = URI.create(trimmed);
            if (uri.getScheme() != null) {
                String path = uri.getPath();
                if (path != null && !path.isBlank()) {
                    return normalizeChatAttachmentPath(path);
                }
            }
        } catch (IllegalArgumentException ignored) {
            // Fall back to lightweight trimming for already path-like values.
        }
        int queryIndex = trimmed.indexOf('?');
        String withoutQuery = queryIndex >= 0 ? trimmed.substring(0, queryIndex) : trimmed;
        if (withoutQuery.startsWith("//")) {
            int pathStart = withoutQuery.indexOf('/', 2);
            if (pathStart >= 0) {
                return normalizeChatAttachmentPath(withoutQuery.substring(pathStart));
            }
        }
        return normalizeChatAttachmentPath(withoutQuery);
    }

    private String normalizeChatAttachmentPath(String path) {
        if (path == null || path.isBlank()) {
            return path;
        }
        if (path.startsWith("/api/chat/files/")) {
            return path;
        }
        if (path.startsWith("/chat/")
                || path.startsWith("chat/")
                || (path.startsWith("/api/chat/") && !path.startsWith("/api/chat/files/"))) {
            int lastSlash = path.lastIndexOf('/');
            if (lastSlash >= 0 && lastSlash < path.length() - 1) {
                return "/api/chat/files/" + path.substring(lastSlash + 1);
            }
        }
        return path;
    }

    private String sign(String path, long expiresAt) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            byte[] digest = mac.doFinal((path + ":" + expiresAt).getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest);
        } catch (Exception e) {
            throw new IllegalStateException("Unable to sign media URL", e);
        }
    }
}
