package com.real_estate.Kunal.Controller;

import com.real_estate.Kunal.DTO.*;
import com.real_estate.Kunal.Service.SubAdminRegistrationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
@Slf4j
public class SubAdminRegistrationController {

    private final SubAdminRegistrationService registrationService;

    /**
     * Step 1: Collect all registration details, create temp record + Razorpay order.
     * Returns order ID and registration token for the frontend to open Razorpay checkout.
     */
    @PostMapping("/subadmin/initiate-registration")
    public ResponseEntity<?> initiateRegistration(@jakarta.validation.Valid @RequestBody InitiateRegistrationRequest request) {
        try {
            InitiateRegistrationResponse response = registrationService.initiateRegistration(request);
            return ResponseEntity.ok(response);
        } catch (org.springframework.web.server.ResponseStatusException e) {
            throw e;
        } catch (IllegalStateException e) {
            return ResponseEntity.status(409).body(Map.of("error", e.getMessage()));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            log.error("Failed to initiate registration: {}", e.getMessage(), e);
            return ResponseEntity.status(500).body(Map.of("error", "Failed to initiate registration. Please try again."));
        }
    }

    /**
     * Real-time email availability check (debounced 500ms on frontend).
     */
    @GetMapping("/subadmin/check-email")
    public ResponseEntity<?> checkEmail(@RequestParam String email) {
        boolean available = registrationService.isEmailAvailable(email);
        return ResponseEntity.ok(Map.of("available", available));
    }

    /**
     * Poll for registration completion status. Returns JWT when COMPLETED.
     */
    @GetMapping("/subadmin/registration-status")
    public ResponseEntity<?> registrationStatus(@RequestParam String token) {
        try {
            RegistrationStatusResponse response = registrationService.getRegistrationStatus(token);
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * Frontend-triggered verification after Razorpay success callback.
     * Runs in parallel with the webhook — whichever completes first wins.
     */
    @PostMapping("/payments/verify-and-complete")
    public ResponseEntity<?> verifyAndComplete(@jakarta.validation.Valid @RequestBody VerifyAndCompleteRequest request) {
        try {
            RegistrationStatusResponse response = registrationService.verifyAndComplete(request);
            return ResponseEntity.ok(response);
        } catch (SecurityException e) {
            return ResponseEntity.status(400).body(Map.of("error", "Payment verification failed"));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            log.error("verify-and-complete failed: {}", e.getMessage(), e);
            return ResponseEntity.status(500).body(Map.of("error", "Verification failed. Your payment is safe — account will be created automatically."));
        }
    }

    /**
     * Mark payment as failed (called by frontend on Razorpay failure callback).
     */
    @PostMapping("/payments/mark-failed")
    public ResponseEntity<?> markFailed(@RequestBody Map<String, String> body) {
        try {
            String token = body.get("registrationToken");
            String errorDescription = body.get("errorDescription");
            registrationService.markFailed(token, errorDescription);
            return ResponseEntity.ok(Map.of("status", "marked_failed"));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }
}
