package com.real_estate.Kunal.Config;

import com.real_estate.Kunal.Security.JwtAuthenticationFilter;
import com.real_estate.Kunal.Security.RateLimitFilter;
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

/**
 * Spring Security configuration.
 *
 * CORS is intentionally disabled here ({@code .cors(cors -> cors.disable())})
 * because CORS headers are handled upstream by the servlet-level filter defined
 * in {@link CorsConfig}, which runs at {@link org.springframework.core.Ordered#HIGHEST_PRECEDENCE}.
 * That filter is the single source of truth for CORS – do not add a second
 * {@code CorsConfigurationSource} bean here.
 */
@Configuration
@EnableMethodSecurity
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtFilter;
    private final RateLimitFilter rateLimitFilter;

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
                        .requestMatchers("/api/test", "/test",
                                "/api/auth/register",
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
                        // POST /api/locations/cities is restricted by @PreAuthorize('SUPER_ADMIN')
                        // on LocationController.addCustomCity — SecurityConfig matcher removed to avoid duplication.
                        // Other /api/locations mutating operations (PUT/PATCH/DELETE, and generic POST)
                        // have no @PreAuthorize, so they are guarded here.
                        .requestMatchers(HttpMethod.POST, "/api/locations").hasAnyRole("SUPER_ADMIN", "SUB_ADMIN", "EMPLOYEE")
                        .requestMatchers(HttpMethod.PUT, "/api/locations/**").hasAnyRole("SUPER_ADMIN", "SUB_ADMIN", "EMPLOYEE")
                        .requestMatchers(HttpMethod.PATCH, "/api/locations/**").hasAnyRole("SUPER_ADMIN", "SUB_ADMIN", "EMPLOYEE")
                        .requestMatchers(HttpMethod.DELETE, "/api/locations/**").hasAnyRole("SUPER_ADMIN", "SUB_ADMIN", "EMPLOYEE")
                        // POST /api/areas and DELETE /api/areas/** are restricted by @PreAuthorize('SUPER_ADMIN')
                        // on AreaController — SecurityConfig matchers removed to avoid duplication.
                        .requestMatchers(HttpMethod.GET, "/api/areas").permitAll()
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
    public PasswordEncoder passwordEncoder(){
        return new BCryptPasswordEncoder();
    }
}
