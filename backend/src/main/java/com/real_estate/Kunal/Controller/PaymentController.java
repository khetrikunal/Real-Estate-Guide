package com.real_estate.Kunal.Controller;

import com.real_estate.Kunal.DTO.VerifyPaymentRequest;
import com.real_estate.Kunal.DTO.VerifyPaymentResponse;
import com.real_estate.Kunal.Service.PaymentService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/payment")
@RequiredArgsConstructor
public class PaymentController {

    private final PaymentService paymentService;

    /**
     * Creates a Razorpay order and persists a Payment record.
     * Permitted without authentication so the SuperAdmin flow can initiate payment
     * before the new SubAdmin account exists.
     */
    @PostMapping("/create-order")
    public ResponseEntity<?> createOrder(@RequestBody Map<String, Object> body) throws Exception {
        return ResponseEntity.ok(paymentService.createOrder(body));
    }

    /**
     * Verifies a Razorpay payment signature and marks the payment as 'paid'.
     * Called after the Razorpay checkout completes successfully on the client.
     */
    @PostMapping("/verify")
    public ResponseEntity<?> verifyPayment(@Valid @RequestBody VerifyPaymentRequest request) {
        VerifyPaymentResponse response = paymentService.verifyPayment(request);
        return ResponseEntity.status(response.isSuccess() ? 200 : 400).body(response);
    }

    /**
     * Returns the most recent payment record linked to a specific SubAdmin.
     * Used by the SuperAdmin list to show payment status in SubAdmin cards.
     */
    @GetMapping("/by-subadmin/{subAdminId}")
    @org.springframework.security.access.prepost.PreAuthorize("@subscriptionService.canAccessSubscription(#subAdminId)")
    public ResponseEntity<?> getPaymentBySubAdmin(@PathVariable Long subAdminId) {
        return paymentService.findPaymentBySubAdminId(subAdminId)
                .<ResponseEntity<?>>map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.noContent().build());
    }

    /**
     * Creates a Razorpay order for subscription renewal.
     * Public endpoint — used from login page when subscription is expired.
     */
    @PostMapping("/renew")
    public ResponseEntity<?> createRenewalOrder(@RequestBody Map<String, Object> body) throws Exception {
        if (!(body.get("email") instanceof String email) || email.isBlank()) {
            throw new IllegalArgumentException("email is required");
        }
        return ResponseEntity.ok(paymentService.createRenewalOrder(body));
    }

    /**
     * Verifies a renewal payment and extends subscription by 1 month.
     * Public endpoint — used from login page.
     */
    @PostMapping("/renew/verify")
    public ResponseEntity<?> verifyRenewalPayment(@Valid @RequestBody VerifyPaymentRequest request) {
        VerifyPaymentResponse response = paymentService.verifyRenewalPayment(request);
        return ResponseEntity.status(response.isSuccess() ? 200 : 400).body(response);
    }
}
