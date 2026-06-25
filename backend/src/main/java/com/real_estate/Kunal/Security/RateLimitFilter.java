package com.real_estate.Kunal.Security;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentLinkedDeque;

@Component
public class RateLimitFilter extends OncePerRequestFilter {

    private record RateLimitRule(String method, String pathPrefix, int maxRequests, Duration window) {
    }

    private static final List<RateLimitRule> RULES = List.of(
            new RateLimitRule("POST", "/api/auth/login", 5, Duration.ofMinutes(1)),
            new RateLimitRule("POST", "/api/auth/register", 3, Duration.ofMinutes(1)),
            new RateLimitRule("POST", "/api/auth/forgot-password/send-otp", 5, Duration.ofMinutes(1)),
            new RateLimitRule("POST", "/api/chat/upload", 20, Duration.ofMinutes(1)),
            new RateLimitRule("POST", "/api/chat/conversations", 60, Duration.ofMinutes(1)),
            new RateLimitRule("POST", "/api/chat/messages/", 90, Duration.ofMinutes(1)),
            new RateLimitRule("DELETE", "/api/chat/messages/", 90, Duration.ofMinutes(1)),
            new RateLimitRule("PATCH", "/api/chat/messages/", 30, Duration.ofMinutes(1)),
            new RateLimitRule("GET", "/api/locations", 100, Duration.ofMinutes(1)),
            new RateLimitRule("GET", "/actuator/health", 100, Duration.ofMinutes(1))
    );

    private final ConcurrentHashMap<String, ConcurrentLinkedDeque<Long>> requestBuckets =
            new ConcurrentHashMap<>();

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain
    ) throws ServletException, IOException {
        RateLimitRule matchingRule = findMatchingRule(request);
        if (matchingRule == null) {
            filterChain.doFilter(request, response);
            return;
        }

        String clientIp = resolveClientIp(request);
        String bucketKey = matchingRule.method() + ":" + matchingRule.pathPrefix() + ":" + clientIp;
        long now = System.currentTimeMillis();
        long windowStart = now - matchingRule.window().toMillis();

        ConcurrentLinkedDeque<Long> bucket = requestBuckets.computeIfAbsent(
                bucketKey,
                ignored -> new ConcurrentLinkedDeque<>()
        );

        synchronized (bucket) {
            while (!bucket.isEmpty() && bucket.peekFirst() != null && bucket.peekFirst() < windowStart) {
                bucket.pollFirst();
            }

            if (bucket.size() >= matchingRule.maxRequests()) {
                writeRateLimitResponse(response, matchingRule);
                return;
            }

            bucket.addLast(now);
        }

        filterChain.doFilter(request, response);
    }

    private RateLimitRule findMatchingRule(HttpServletRequest request) {
        String method = request.getMethod();
        String path = request.getServletPath();
        for (RateLimitRule rule : RULES) {
            if (rule.method().equalsIgnoreCase(method) && path.startsWith(rule.pathPrefix())) {
                return rule;
            }
        }
        return null;
    }

    private String resolveClientIp(HttpServletRequest request) {
        String forwardedFor = request.getHeader("X-Forwarded-For");
        if (forwardedFor != null && !forwardedFor.isBlank()) {
            return forwardedFor.split(",")[0].trim();
        }
        String realIp = request.getHeader("X-Real-IP");
        if (realIp != null && !realIp.isBlank()) {
            return realIp.trim();
        }
        return request.getRemoteAddr();
    }

    private void writeRateLimitResponse(HttpServletResponse response, RateLimitRule rule) throws IOException {
        response.setStatus(429);
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.getWriter().write(objectMapper.writeValueAsString(Map.of(
                "status", 429,
                "error", "Too Many Requests",
                "message", "Rate limit exceeded for " + rule.pathPrefix()
        )));
    }
}
