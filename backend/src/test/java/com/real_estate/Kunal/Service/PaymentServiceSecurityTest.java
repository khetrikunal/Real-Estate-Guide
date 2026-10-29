package com.real_estate.Kunal.Service;

import com.real_estate.Kunal.DTO.VerifyPaymentRequest;
import com.real_estate.Kunal.Entity.*;
import com.real_estate.Kunal.Repository.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.util.*;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.*;

class PaymentServiceSecurityTest {
    private final PaymentRepository payments = mock(PaymentRepository.class);
    private final UserRepository users = mock(UserRepository.class);
    private final LocationService locations = mock(LocationService.class);
    private final SubscriptionService subscriptions = mock(SubscriptionService.class);
    private final PaymentService service = spy(new PaymentService(payments, mock(LocationRepository.class), locations, users, subscriptions));

    @BeforeEach
    void configure() {
        ReflectionTestUtils.setField(service, "keyId", "rzp_test_key");
        ReflectionTestUtils.setField(service, "keySecret", "secret");
    }

    @Test
    void priceAndRateComeFromServerRatherThanRequest() throws Exception {
        doReturn("order_test").when(service).createGatewayOrder(anyInt(), anyString(), anyString());
        var response = service.createOrder(Map.of("planType", "full", "amountInPaise", 1, "subscriptionRate", 0.01));
        assertThat(response.get("amountInPaise")).isEqualTo(2000000);
        verify(payments).save(argThat(p -> p.getAmountInPaise() == 2000000 && p.getSubscriptionRate() == 20000.0));
    }

    @Test
    void customPriceUsesConfiguredLocationRates() throws Exception {
        doReturn("order_test").when(service).createGatewayOrder(anyInt(), anyString(), anyString());
        when(locations.getLocationRate("Pune", "Maharashtra", null)).thenReturn(Optional.of(450.0));
        var response = service.createOrder(Map.of("planType", "custom", "assignedCity", "Pune", "assignedState", "Maharashtra", "amountInPaise", 1));
        assertThat(response.get("amountInPaise")).isEqualTo(45000);
    }

    @Test
    void duplicateRenewalExtendsExpiryExactlyOnce() throws Exception {
        Payment payment = Payment.builder().razorpayOrderId("order_1").subAdminId(2L)
                .planType("full").subscriptionRate(20000.0).status("created").build();
        User user = User.builder().id(2L).role(Role.SUB_ADMIN).subscriptionExpiresAt(LocalDate.now()).build();
        when(payments.findByOrderIdForUpdate("order_1")).thenReturn(Optional.of(payment));
        when(users.findByIdForUpdate(2L)).thenReturn(Optional.of(user));
        VerifyPaymentRequest request = signedRequest();
        assertThat(service.verifyRenewalPayment(request).isSuccess()).isTrue();
        LocalDate expiry = user.getSubscriptionExpiresAt();
        assertThat(service.verifyRenewalPayment(request).isSuccess()).isTrue();
        assertThat(user.getSubscriptionExpiresAt()).isEqualTo(expiry);
        verify(users, times(1)).save(user);
        verify(subscriptions, times(1)).recordRenewal(eq(2L), eq("full"), eq(20000.0), any(), any());
    }

    @Test
    void verifiedPaymentStillRequiresMatchingSignature() {
        Payment payment = Payment.builder().status("paid").razorpayPaymentId("pay_1").build();
        when(payments.findByOrderIdForUpdate("order_1")).thenReturn(Optional.of(payment));
        VerifyPaymentRequest request = new VerifyPaymentRequest();
        request.setRazorpayOrderId("order_1");
        request.setRazorpayPaymentId("pay_other");
        request.setRazorpaySignature("invalid");
        assertThat(service.verifyPayment(request).isSuccess()).isFalse();
        verify(payments, never()).save(any());
    }

    private VerifyPaymentRequest signedRequest() throws Exception {
        Mac mac = Mac.getInstance("HmacSHA256");
        mac.init(new SecretKeySpec("secret".getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
        VerifyPaymentRequest request = new VerifyPaymentRequest();
        request.setRazorpayOrderId("order_1");
        request.setRazorpayPaymentId("pay_1");
        request.setRazorpaySignature(HexFormat.of().formatHex(mac.doFinal("order_1|pay_1".getBytes(StandardCharsets.UTF_8))));
        return request;
    }
}
