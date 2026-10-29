package com.real_estate.Kunal.Security;

import com.real_estate.Kunal.Entity.Role;
import com.real_estate.Kunal.Entity.User;
import com.real_estate.Kunal.util.JwtUtil;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;
import java.util.Map;
import static org.assertj.core.api.Assertions.assertThat;

class JwtAccessTokenTest {
    private final JwtUtil jwt = new JwtUtil();
    private final User user = User.builder().id(1L).email("member@example.com")
            .role(Role.EMPLOYEE).tokenVersion(3L).build();

    @BeforeEach
    void configure() {
        ReflectionTestUtils.setField(jwt, "secretKey", "test-secret-with-at-least-thirty-two-characters");
        ReflectionTestUtils.setField(jwt, "expiration", 60000L);
        ReflectionTestUtils.setField(jwt, "issuer", "test");
        ReflectionTestUtils.setField(jwt, "audience", "test-clients");
    }

    @Test
    void accessTokenMustMatchCurrentUserVersionAndRole() {
        String token = jwt.generateToken(user.getEmail(), "EMPLOYEE", user.getId(), 3L);
        assertThat(jwt.validateAccessToken(token, user)).isTrue();
        user.setTokenVersion(4L);
        assertThat(jwt.validateAccessToken(token, user)).isFalse();
        user.setTokenVersion(3L);
        user.setRole(Role.ADMIN);
        assertThat(jwt.validateAccessToken(token, user)).isFalse();
    }

    @Test
    void resetTokensAndLegacyTokensCannotAuthenticate() {
        String reset = jwt.generateTokenWithClaims(user.getEmail(),
                Map.of("purpose", "reset_password", "tokenVersion", 3L), 60000);
        String legacy = jwt.generateTokenWithClaims(user.getEmail(), Map.of("role", "EMPLOYEE"), 60000);
        assertThat(jwt.validateAccessToken(reset, user)).isFalse();
        assertThat(jwt.validateAccessToken(legacy, user)).isFalse();
        assertThat(jwt.validateAccessToken("broken", user)).isFalse();
    }
}
