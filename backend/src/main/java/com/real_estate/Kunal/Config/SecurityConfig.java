package com.real_estate.Kunal.Config;

import com.real_estate.Kunal.Security.JwtAuthenticationFilter;
import com.real_estate.Kunal.Security.RateLimitFilter;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.*;

import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;

@Configuration
@EnableMethodSecurity
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtFilter;
    private final RateLimitFilter rateLimitFilter;

    @Value("${app.security.allowed-origins:http://localhost:53124,http://127.0.0.1:53124,http://localhost:56518,http://127.0.0.1:56518,http://localhost:[*],http://127.0.0.1:[*],http://[::1]:[*],https://realestate-guide.in,https://www.realestate-guide.in}")
    private String allowedOrigins;

    public SecurityConfig(JwtAuthenticationFilter jwtFilter, RateLimitFilter rateLimitFilter) {
        this.jwtFilter = jwtFilter;
        this.rateLimitFilter = rateLimitFilter;
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http)
            throws Exception {

        // Keep specific matchers above broader wildcards; order matters.
        http
                .cors(cors -> cors.disable())
                .csrf(csrf -> csrf.disable())
                .headers(headers -> headers
                        .contentTypeOptions(Customizer.withDefaults())
                        .frameOptions(frame -> frame.deny())
                        .httpStrictTransportSecurity(hsts -> hsts
                                .includeSubDomains(true)
                                .preload(true)
                                .maxAgeInSeconds(31536000))
                        .contentSecurityPolicy(csp -> csp.policyDirectives(
                                "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'"
                        )))
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                        .requestMatchers( "/api/auth/register",
                                "/api/auth/login",
                            "/api/auth/forgot-password/send-otp",
                            "/api/auth/forgot-password/verify-otp",
                            "/api/auth/forgot-password/reset-password",
                        "/api/payment/create-order",
                        "/api/payment/verify",
                        "/api/payment/renew",
                        "/api/payment/renew/verify",
                        "/api/subadmin/initiate-registration",
                        "/api/subadmin/check-email",
                        "/api/subadmin/registration-status",
                        "/api/payments/verify-and-complete",
                        "/api/payments/mark-failed",
                        "/api/payments/webhook",
                        "/api/kyc/uploads/temp/**",
                                "/ws/**",
                                  "/actuator/health",
                                  "/actuator/health/**").permitAll()
                           .requestMatchers("/swagger-ui/**",
                                   "/v3/api-docs/**",
                                   "/swagger-ui.html").hasAnyRole("SUPER_ADMIN", "ADMIN")
                           .requestMatchers("/error").permitAll()
                        .requestMatchers(HttpMethod.GET, "/").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/chat/files/**").permitAll()
                        .requestMatchers("/api/chat/**").authenticated()
                        .requestMatchers("/api/auth/me").authenticated()
                        .requestMatchers(HttpMethod.PATCH, "/api/users/**").hasAnyRole("SUPER_ADMIN", "ADMIN", "SUB_ADMIN", "EMPLOYEE")
                        .requestMatchers("/api/superadmin/**").hasRole("SUPER_ADMIN")
                            .requestMatchers("/api/admin/**").hasAnyRole("SUPER_ADMIN", "ADMIN")
                        .requestMatchers("/api/employees", "/api/employees/**").hasAnyRole("SUPER_ADMIN", "ADMIN")
                        .requestMatchers(HttpMethod.GET, "/api/locations").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/locations/**").permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/locations", "/api/locations/**").hasAnyRole("SUPER_ADMIN", "SUB_ADMIN", "EMPLOYEE")
                        .requestMatchers(HttpMethod.PUT, "/api/locations/**").hasAnyRole("SUPER_ADMIN", "SUB_ADMIN", "EMPLOYEE")
                        .requestMatchers(HttpMethod.PATCH, "/api/locations/**").hasAnyRole("SUPER_ADMIN", "SUB_ADMIN", "EMPLOYEE")
                        .requestMatchers(HttpMethod.DELETE, "/api/locations/**").hasAnyRole("SUPER_ADMIN", "SUB_ADMIN", "EMPLOYEE")
                        .requestMatchers(HttpMethod.GET, "/api/areas").permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/areas").hasAnyRole("SUPER_ADMIN", "SUB_ADMIN", "EMPLOYEE")
                        .requestMatchers(HttpMethod.DELETE, "/api/areas/**").hasAnyRole("SUPER_ADMIN", "SUB_ADMIN", "EMPLOYEE")
                        .requestMatchers("/api/subscription/**").hasAnyRole("SUPER_ADMIN", "ADMIN", "SUB_ADMIN")
                        .requestMatchers("/api/projects/**").hasAnyRole("SUPER_ADMIN", "ADMIN", "SUB_ADMIN", "EMPLOYEE")
                        .requestMatchers("/api/kyc/**").authenticated()
                        .requestMatchers(HttpMethod.GET, "/api/documents/download/**").permitAll()
                        .requestMatchers("/api/documents/**").hasAnyRole("SUPER_ADMIN", "ADMIN", "SUB_ADMIN", "EMPLOYEE")
                        .requestMatchers("/api/leads/**").hasAnyRole("SUPER_ADMIN", "ADMIN", "SUB_ADMIN", "EMPLOYEE")
                        .requestMatchers("/api/crm/**").hasAnyRole("SUPER_ADMIN", "ADMIN", "SUB_ADMIN", "EMPLOYEE")
                        .anyRequest().authenticated()
                )
                .addFilterBefore(rateLimitFilter, UsernamePasswordAuthenticationFilter.class)
                .addFilterBefore(jwtFilter,
                        UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }
    @Bean
    public CorsConfigurationSource corsConfigurationSource() {

        CorsConfiguration config = new CorsConfiguration();

        config.setAllowedOriginPatterns(Arrays.stream(allowedOrigins.split(","))
                .map(String::trim)
                .filter(origin -> !origin.isBlank())
                .collect(Collectors.toList()));
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"));
        config.setAllowedHeaders(List.of("*"));
        config.setExposedHeaders(List.of("Authorization", "Content-Disposition", "Content-Range", "Accept-Ranges"));
        config.setAllowCredentials(true);
        config.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);

        return source;
    }

    @Bean
    public PasswordEncoder passwordEncoder(){
        return new BCryptPasswordEncoder();
    }
}
