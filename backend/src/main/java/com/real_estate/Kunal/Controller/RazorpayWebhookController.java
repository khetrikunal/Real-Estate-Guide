package com.real_estate.Kunal.Controller;

import com.real_estate.Kunal.Service.SubAdminRegistrationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.json.JSONObject;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/payments")
@RequiredArgsConstructor
@Slf4j
public class RazorpayWebhookController {

    private final SubAdminRegistrationService registrationService;

    /**
     * Razorpay server-to-server webhook endpoint.
     * Fires when payment.captured event occurs — completely independent of frontend.
     * ALWAYS returns HTTP 200 to prevent Razorpay retries (which cause duplicates).
     */
    @PostMapping("/webhook")
    public ResponseEntity<String> handleWebhook(
            @RequestBody String rawBody,
            @RequestHeader(value = "X-Razorpay-Signature", required = false) String signatureHeader) {

        try {
            JSONObject payload = new JSONObject(rawBody);
            String event = payload.optString("event", "");

            log.info("Razorpay webhook received: event={}", event);

            if (!"payment.captured".equals(event)) {
                log.info("Ignoring webhook event: {}", event);
                return ResponseEntity.ok("ignored");
            }

            // Extract payment details from webhook payload
            JSONObject paymentEntity = payload
                    .getJSONObject("payload")
                    .getJSONObject("payment")
                    .getJSONObject("entity");

            String orderId = paymentEntity.optString("order_id", null);
            String paymentId = paymentEntity.optString("id", null);

            if (orderId == null || paymentId == null) {
                log.warn("Webhook missing order_id or payment_id");
                return ResponseEntity.ok("missing_data");
            }

            log.info("Processing webhook: orderId={}, paymentId={}", orderId, paymentId);

            registrationService.handleWebhookPayment(orderId, paymentId, rawBody, signatureHeader);

            return ResponseEntity.ok("processed");

        } catch (SecurityException e) {
            log.warn("Webhook signature verification failed: {}", e.getMessage());
            // Still return 200 — don't tell Razorpay to retry a bad signature
            return ResponseEntity.ok("signature_failed");
        } catch (Exception e) {
            log.error("Webhook processing error: {}", e.getMessage(), e);
            // Still return 200 to prevent Razorpay retries
            return ResponseEntity.ok("error");
        }
    }
}
