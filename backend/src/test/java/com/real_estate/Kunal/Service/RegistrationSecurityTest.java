package com.real_estate.Kunal.Service;

import com.real_estate.Kunal.DTO.*;
import com.real_estate.Kunal.Entity.TempRegistration;
import com.real_estate.Kunal.Repository.*;
import com.real_estate.Kunal.util.JwtUtil;
import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;
import java.util.*;
import java.time.LocalDateTime;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.*;

class RegistrationSecurityTest {
    private final TempRegistrationRepository temps = mock(TempRegistrationRepository.class);
    private final PasswordEncoder encoder = mock(PasswordEncoder.class);
    private final SubAdminRegistrationService service = new SubAdminRegistrationService(temps, mock(UserRepository.class),
            mock(LocationRepository.class), mock(CustomCityRepository.class), mock(AreaRepository.class), encoder,
            mock(JwtUtil.class), mock(KycDocumentService.class));

    @Test
    void cannotResumeWithOnlyVictimEmail() {
        ReflectionTestUtils.setField(service, "razorpayKeyId", "test_key");
        ReflectionTestUtils.setField(service, "razorpayKeySecret", "test_secret");
        when(temps.findFirstByEmailIgnoreCaseAndStatusIn(anyString(), anyList()))
                .thenReturn(Optional.of(TempRegistration.builder().passwordHash("real_hash")
                        .expiresAt(LocalDateTime.now().plusHours(1)).build()));
        when(encoder.matches("wrong-password", "real_hash")).thenReturn(false);
        var request = new InitiateRegistrationRequest();
        request.setEmail("victim@example.com");
        request.setPassword("wrong-password");
        assertThatThrownBy(() -> service.initiateRegistration(request))
                .isInstanceOf(org.springframework.web.server.ResponseStatusException.class);
    }

    @Test
    void paymentFromDifferentOrderCannotCompleteRegistration() {
        UUID token = UUID.randomUUID();
        when(temps.findByRegistrationToken(token)).thenReturn(Optional.of(TempRegistration.builder()
                .razorpayOrderId("expected_order").build()));
        var request = new VerifyAndCompleteRequest();
        request.setRegistrationToken(token.toString());
        request.setRazorpayOrderId("another_order");
        assertThatThrownBy(() -> service.verifyAndComplete(request)).isInstanceOf(SecurityException.class);
        verify(temps, never()).save(any());
    }

    @Test
    void webhookFailsClosedWhenSecretIsUnconfigured() {
        assertThatThrownBy(() -> service.handleWebhookPayment("order", "payment", "{}", null))
                .isInstanceOf(SecurityException.class);
        verifyNoInteractions(temps);
    }
}
