package com.real_estate.Kunal.Controller;

import com.real_estate.Kunal.Entity.Payment;
import com.real_estate.Kunal.Service.PaymentService;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class PaymentControllerTest {

    @Test
    void getPaymentBySubAdminReturnsNoContentWhenHistoryIsEmpty() {
        PaymentService paymentService = mock(PaymentService.class);
        when(paymentService.findPaymentBySubAdminId(3L)).thenReturn(Optional.empty());

        PaymentController controller = new PaymentController(paymentService);

        ResponseEntity<?> response = controller.getPaymentBySubAdmin(3L);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NO_CONTENT);
        assertThat(response.getBody()).isNull();
    }

    @Test
    void getPaymentBySubAdminReturnsLatestPaymentWhenPresent() {
        Payment payment = Payment.builder()
                .id(10L)
                .subAdminId(3L)
                .status("paid")
                .razorpayPaymentId("pay_test")
                .build();
        PaymentService paymentService = mock(PaymentService.class);
        when(paymentService.findPaymentBySubAdminId(3L)).thenReturn(Optional.of(payment));

        PaymentController controller = new PaymentController(paymentService);

        ResponseEntity<?> response = controller.getPaymentBySubAdmin(3L);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isSameAs(payment);
    }
}
