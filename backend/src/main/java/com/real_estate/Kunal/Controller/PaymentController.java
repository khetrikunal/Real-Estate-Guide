package com.real_estate.Kunal.Controller;

import com.real_estate.Kunal.DTO.CreateOrderRequest;
import com.real_estate.Kunal.DTO.CreateOrderResponse;
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
    public ResponseEntity<?> createOrder(@RequestBody Map<String, Object> body) {
        try {
            Map<String, Object> response = paymentService.createOrder(body);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * Verifies a Razorpay payment signature and marks the payment as 'paid'.
     * Called after the Razorpay checkout completes successfully on the client.
     */
    @PostMapping("/verify")
    public ResponseEntity<?> verifyPayment(@Valid @RequestBody VerifyPaymentRequest request) {
        try {
            VerifyPaymentResponse response = paymentService.verifyPayment(request);
            if (!response.isSuccess()) {
                return ResponseEntity.status(400).body(response);
            }
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(404).body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * Returns the most recent payment record linked to a specific SubAdmin.
     * Used by the SuperAdmin list to show payment status in SubAdmin cards.
     */
    @GetMapping("/by-subadmin/{subAdminId}")
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
    public ResponseEntity<?> createRenewalOrder(@RequestBody Map<String, Object> body) {
        try {
            String email = (String) body.get("email");
            if (email == null || email.isBlank()) {
                return ResponseEntity.badRequest().body(Map.of("error", "email is required"));
            }
            Map<String, Object> response = paymentService.createRenewalOrder(body);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * Verifies a renewal payment and extends subscription by 1 month.
     * Public endpoint — used from login page.
     */
    @PostMapping("/renew/verify")
    public ResponseEntity<?> verifyRenewalPayment(@RequestBody Map<String, Object> body) {
        try {
            VerifyPaymentRequest req = new VerifyPaymentRequest();
            req.setRazorpayOrderId((String) body.get("razorpayOrderId"));
            req.setRazorpayPaymentId((String) body.get("razorpayPaymentId"));
            req.setRazorpaySignature((String) body.get("razorpaySignature"));
            VerifyPaymentResponse response = paymentService.verifyRenewalPayment(req);
            if (!response.isSuccess()) {
                return ResponseEntity.status(400).body(response);
            }
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", e.getMessage()));
        }
    }
}
