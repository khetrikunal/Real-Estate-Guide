package com.real_estate.Kunal.Security;

import com.real_estate.Kunal.util.JwtUtil;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

@Component
@RequiredArgsConstructor
@Slf4j
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtUtil jwtUtil;
    private final CustomUserDetailsService userDetailsService;
    private final com.real_estate.Kunal.Repository.UserRepository userRepository;

    private boolean allowsQueryToken(HttpServletRequest request) {
        if (!"GET".equalsIgnoreCase(request.getMethod())) {
            return false;
        }
        String path = request.getServletPath();
        return path.startsWith("/api/documents/download/")
                || path.startsWith("/api/chat/files/");
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain)
            throws ServletException, IOException {

        String path = request.getServletPath();

        // Skip CORS preflight OPTIONS requests
        if ("OPTIONS".equalsIgnoreCase(request.getMethod())) {
            filterChain.doFilter(request, response);
            return;
        }

        // Skip only public auth endpoints. Authenticated auth endpoints (for example
        // /api/auth/change-password) must go through JWT validation.
        boolean isPublicAuthEndpoint = path.equals("/api/auth/login")
            || path.equals("/api/auth/forgot-password/send-otp")
            || path.equals("/api/auth/forgot-password/verify-otp")
            || path.equals("/api/auth/forgot-password/reset-password");

        if (isPublicAuthEndpoint || path.startsWith("/ws")) {
            filterChain.doFilter(request, response);
            return;
        }

        String authHeader = request.getHeader("Authorization");
        final boolean isDocumentRequest = path.startsWith("/api/documents");
        final boolean isProtectedMediaRequest = allowsQueryToken(request);

        String token = null;
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            token = authHeader.substring(7);
        } else if (isProtectedMediaRequest) {
            String tokenParam = request.getParameter("token");
            if (tokenParam != null && !tokenParam.isBlank()) {
                token = tokenParam.trim();
            }
        }

        if (token == null || token.isBlank()) {
            if (isDocumentRequest || isProtectedMediaRequest) {
                log.warn("Missing/invalid Authorization header on {} {}. Header='{}'",
                        request.getMethod(), path, authHeader);
            }
            filterChain.doFilter(request, response);
            return;
        }

        String email;
        try {
            email = jwtUtil.extractEmail(token);
        } catch (Exception ex) {
            if (isDocumentRequest || isProtectedMediaRequest) {
                log.warn("JWT parse failed on {} {}: {}",
                        request.getMethod(), path, ex.getMessage());
            }
            filterChain.doFilter(request, response);
            return;
        }

        if (email != null && SecurityContextHolder.getContext().getAuthentication() == null) {
            UserDetails userDetails;
            try {
                userDetails = userDetailsService.loadUserByUsername(email);
            } catch (UsernameNotFoundException ex) {
                if (isDocumentRequest || isProtectedMediaRequest) {
                    log.warn("JWT subject not found as active user on {} {}",
                            request.getMethod(), path);
                }
                filterChain.doFilter(request, response);
                return;
            }

            if (jwtUtil.validateAccessToken(token, userRepository.findByEmail(email).orElse(null))) {

                UsernamePasswordAuthenticationToken authToken =
                        new UsernamePasswordAuthenticationToken(
                                userDetails,
                                null,
                                userDetails.getAuthorities()
                        );

                authToken.setDetails(
                        new WebAuthenticationDetailsSource().buildDetails(request)
                );

                SecurityContextHolder.getContext().setAuthentication(authToken);
            } else if (isDocumentRequest || isProtectedMediaRequest) {
                log.warn("JWT validation failed on {} {}",
                        request.getMethod(), path);
            }
        }

        filterChain.doFilter(request, response);
    }
}
