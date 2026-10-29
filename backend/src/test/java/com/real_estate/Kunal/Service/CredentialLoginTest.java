package com.real_estate.Kunal.Service;

import com.real_estate.Kunal.DTO.LoginRequest;
import com.real_estate.Kunal.Entity.Role;
import com.real_estate.Kunal.Entity.User;
import com.real_estate.Kunal.Repository.PaymentRepository;
import com.real_estate.Kunal.Repository.UserRepository;
import com.real_estate.Kunal.util.JwtUtil;
import jakarta.validation.Validation;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CredentialLoginTest {
    @Mock private UserRepository users;
    @Mock private PasswordEncoder passwords;
    @Mock private JwtUtil jwt;
    @Mock private PaymentService payments;
    @Mock private PaymentRepository paymentRepository;
    private AuthService service;

    @BeforeEach
    void setUp() {
        service = new AuthService(users, passwords, jwt, payments, paymentRepository);
    }

    @ParameterizedTest
    @EnumSource(Role.class)
    void authenticatesEveryAccountRoleUsingOnlyCredentials(Role role) {
        LoginRequest request = credentials();
        User account = account(role);
        when(users.findByEmail("person@example.com")).thenReturn(Optional.of(account));
        when(passwords.matches("correct-password", "encoded-password")).thenReturn(true);

        assertThat(service.authenticate(request)).isSameAs(account);
        assertThat(account.getRole()).isEqualTo(role);
        assertThat(account.getLastLoginAt()).isNotNull();
        verify(users).save(account);
    }

    @Test
    void rejectsIncorrectPasswordWithoutSavingTheAccount() {
        when(users.findByEmail("person@example.com")).thenReturn(Optional.of(account(Role.SUPER_ADMIN)));
        when(passwords.matches("correct-password", "encoded-password")).thenReturn(false);

        assertThatThrownBy(() -> service.authenticate(credentials())).hasMessage("Invalid password");
        verify(users, never()).save(any(User.class));
    }

    @Test
    void rejectsALegacyRoleThatDoesNotMatchTheAccount() {
        LoginRequest request = credentials();
        request.setRole("SUPER_ADMIN");
        when(users.findByEmail("person@example.com")).thenReturn(Optional.of(account(Role.EMPLOYEE)));
        when(passwords.matches("correct-password", "encoded-password")).thenReturn(true);

        assertThatThrownBy(() -> service.authenticate(request)).hasMessage("Selected role does not match this account");
        verify(users, never()).save(any(User.class));
    }

    @Test
    void validatesCredentialsWithoutRequiringARole() {
        try (var factory = Validation.buildDefaultValidatorFactory()) {
            LoginRequest request = credentials();
            assertThat(factory.getValidator().validate(request)).isEmpty();
            request.setRole("UNKNOWN");
            assertThat(factory.getValidator().validate(request))
                    .anyMatch(violation -> violation.getPropertyPath().toString().equals("role"));
        }
    }

    private LoginRequest credentials() {
        LoginRequest request = new LoginRequest();
        request.setEmail("person@example.com");
        request.setPassword("correct-password");
        return request;
    }

    private User account(Role role) {
        return User.builder().email("person@example.com").password("encoded-password").role(role).build();
    }
}
