package com.real_estate.Kunal.Config;

import jakarta.servlet.Filter;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.Ordered;

import java.net.URI;
import java.util.Arrays;
import java.util.Set;
import java.util.stream.Collectors;

@Configuration
public class CorsConfig {

    // Default is production-safe (real domain only).
    // For local development, set APP_SECURITY_ALLOWED_ORIGINS in your .env,
    // e.g.: APP_SECURITY_ALLOWED_ORIGINS=http://localhost:5173,https://realestate-guide.in
    // Note: the isAllowedOrigin() wildcard below already allows any localhost/127.0.0.1/::1
    // port for requests not matched by the configured set, so plain localhost dev still works.
    @Value("${app.security.allowed-origins:https://realestate-guide.in,https://www.realestate-guide.in}")
    private String allowedOrigins;

    @Bean
    public FilterRegistrationBean<Filter> corsFilterRegistration() {

        Set<String> configuredOrigins = Arrays.stream(allowedOrigins.split(","))
                .map(String::trim)
                .filter(origin -> !origin.isBlank())
                .collect(Collectors.toSet());

        Filter corsFilter = (request, response, chain) -> {
            HttpServletRequest httpRequest = (HttpServletRequest) request;
            HttpServletResponse httpResponse = (HttpServletResponse) response;
            String origin = httpRequest.getHeader("Origin");

            if (isAllowedOrigin(origin, configuredOrigins)) {
                String requestedHeaders = httpRequest.getHeader("Access-Control-Request-Headers");
                httpResponse.setHeader("Access-Control-Allow-Origin", origin);
                httpResponse.setHeader("Access-Control-Allow-Credentials", "true");
                httpResponse.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS,PATCH");
                httpResponse.setHeader("Access-Control-Allow-Headers",
                        requestedHeaders == null || requestedHeaders.isBlank()
                                ? "Authorization,Content-Type,Accept,Origin,X-Requested-With"
                                : requestedHeaders);
                httpResponse.setHeader("Access-Control-Expose-Headers",
                        "Authorization,Content-Disposition,Content-Range,Accept-Ranges");
                httpResponse.setHeader("Access-Control-Max-Age", "3600");
                httpResponse.setHeader("Vary", "Origin, Access-Control-Request-Method, Access-Control-Request-Headers");
            }

            if ("OPTIONS".equalsIgnoreCase(httpRequest.getMethod())) {
                httpResponse.setStatus(HttpServletResponse.SC_OK);
                return;
            }

            chain.doFilter(request, response);
        };

        FilterRegistrationBean<Filter> bean = new FilterRegistrationBean<>(corsFilter);
        bean.setOrder(Ordered.HIGHEST_PRECEDENCE);

        return bean;
    }

    private boolean isAllowedOrigin(String origin, Set<String> configuredOrigins) {
        if (origin == null || origin.isBlank()) {
            return false;
        }
        if (configuredOrigins.contains(origin)) {
            return true;
        }
        try {
            URI uri = URI.create(origin);
            String scheme = uri.getScheme();
            String host = uri.getHost();
            return "http".equalsIgnoreCase(scheme)
                    && ("localhost".equalsIgnoreCase(host)
                    || "127.0.0.1".equals(host)
                    || "::1".equals(host));
        } catch (IllegalArgumentException ex) {
            return false;
        }
    }
}
