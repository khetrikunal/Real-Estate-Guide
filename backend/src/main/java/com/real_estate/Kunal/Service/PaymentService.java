package com.real_estate.Kunal.Service;

import com.razorpay.Order;
import com.razorpay.RazorpayClient;
import com.real_estate.Kunal.DTO.VerifyPaymentRequest;
import com.real_estate.Kunal.DTO.VerifyPaymentResponse;
import com.real_estate.Kunal.Entity.Payment;
import com.real_estate.Kunal.Entity.Location;
import com.real_estate.Kunal.Repository.LocationRepository;
import com.real_estate.Kunal.Repository.PaymentRepository;
import lombok.RequiredArgsConstructor;
import org.json.JSONObject;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.time.LocalDateTime;
import java.util.HexFormat;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class PaymentService {

    private final PaymentRepository paymentRepository;
    private final LocationRepository locationRepository;
    private final com.real_estate.Kunal.Repository.UserRepository userRepository;
    private final SubscriptionService subscriptionService;

    @Value("${razorpay.key.id}")
    private String keyId;

    @Value("${razorpay.key.secret}")
    private String keySecret;

    /**
     * Creates a Razorpay order for the given amount and persists a Payment record
     * with status 'created'.
     */
    public Map<String, Object> createOrder(Map<String, Object> body) throws Exception {
        String currency = (body.get("currency") != null && !body.get("currency").toString().isBlank())
                ? body.get("currency").toString() : "INR";

        String razorpayOrderId;
        int amountInPaise;
        Object amountObj = body.get("amountInPaise");
        String planType = body.get("planType") != null ? body.get("planType").toString() : "";
        String assignedCity = body.get("assignedCity") != null ? body.get("assignedCity").toString() : null;
        String assignedState = body.get("assignedState") != null ? body.get("assignedState").toString() : null;
        String assignedArea = body.get("assignedArea") != null ? body.get("assignedArea").toString() : null;

        if (amountObj != null && ((Number) amountObj).intValue() > 0) {
            // Client explicitly provided an amount
            amountInPaise = ((Number) amountObj).intValue();
        } else if ("location_based".equalsIgnoreCase(planType) && assignedCity != null && assignedState != null) {
            // Try area-specific rate first if area is provided
            Location location = null;
            if (assignedArea != null && !assignedArea.isBlank()) {
                location = locationRepository.findByCityIgnoreCaseAndAreaIgnoreCase(assignedCity, assignedArea)
                        .orElse(null);
            }
            // Fall back to city+state rate
            if (location == null || location.getSubscriptionRate() == null) {
                location = locationRepository.findByCityIgnoreCaseAndStateIgnoreCaseAndAreaIsNull(assignedCity, assignedState)
                        .orElseThrow(() -> new RuntimeException(
                                "No subscription rate found for " + assignedCity + ", " + assignedState));
            }
            Double rate = location.getSubscriptionRate();
            if (rate == null || rate <= 0) {
                throw new RuntimeException("Subscription rate not configured for " + assignedCity);
            }
            amountInPaise = (int) (rate * 100); // rate in rupees → paise
        } else {
            // Default to ₹20,000 for full subscription
            amountInPaise = 2000000;
        }

        // When placeholder keys are used (local dev without real Razorpay account),
        // skip the live API call and return a mock order id.
        if (keyId.contains("YourTestKeyId")) {
            razorpayOrderId = "order_mock_" + System.currentTimeMillis();
        } else if (keyId == null || keyId.isBlank() || keySecret == null || keySecret.isBlank()) {
            throw new RuntimeException("Razorpay keys are not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET environment variables.");
        } else {
            RazorpayClient client = new RazorpayClient(keyId, keySecret);
            JSONObject orderRequest = new JSONObject();
            orderRequest.put("amount", amountInPaise);
            orderRequest.put("currency", currency);
            orderRequest.put("receipt", "sub_" + System.currentTimeMillis());
            Order order = client.orders.create(orderRequest);
            razorpayOrderId = order.get("id");
        }

        Payment payment = Payment.builder()
                .razorpayOrderId(razorpayOrderId)
                .amountInPaise((long) amountInPaise)
                .currency(currency)
                .planType(planType)
                .assignedCity(assignedCity)
                .assignedState(assignedState)
                .assignedArea(assignedArea)
                .subscriptionRate(body.get("subscriptionRate") != null
                        ? ((Number) body.get("subscriptionRate")).doubleValue() : null)
                .status("created")
                .build();

        paymentRepository.save(payment);

        return Map.of(
                "orderId", razorpayOrderId,
                "amountInPaise", amountInPaise,
                "currency", currency,
                "keyId", keyId
        );
    }

    /**
     * Verifies the Razorpay payment signature using HMAC-SHA256.
     * Updates payment status to 'paid' on success.
     */
    public VerifyPaymentResponse verifyPayment(VerifyPaymentRequest req) {
        Payment payment = paymentRepository.findByRazorpayOrderId(req.getRazorpayOrderId())
                .orElseThrow(() -> new IllegalArgumentException("Order not found: " + req.getRazorpayOrderId()));

        if ("paid".equals(payment.getStatus()) || "used".equals(payment.getStatus())) {
            return new VerifyPaymentResponse(true, payment.getRazorpayPaymentId(), "Already verified");
        }

        boolean valid = isSignatureValid(req.getRazorpayOrderId(), req.getRazorpayPaymentId(), req.getRazorpaySignature());

        if (!valid) {
            payment.setStatus("failed");
            paymentRepository.save(payment);
            return new VerifyPaymentResponse(false, null, "Signature verification failed");
        }

        payment.setRazorpayPaymentId(req.getRazorpayPaymentId());
        payment.setRazorpaySignature(req.getRazorpaySignature());
        payment.setStatus("paid");
        payment.setVerifiedAt(LocalDateTime.now());
        paymentRepository.save(payment);

        return new VerifyPaymentResponse(true, req.getRazorpayPaymentId(), "Payment verified successfully");
    }

    /**
     * Retrieves a payment record by Razorpay payment ID.
     * Throws if not found or not in a usable 'paid' state.
     */
    public Payment getVerifiedPayment(String razorpayPaymentId) {
        Payment payment = paymentRepository.findByRazorpayPaymentId(razorpayPaymentId)
                .orElseThrow(() -> new IllegalArgumentException("Payment not found: " + razorpayPaymentId));

        if (!"paid".equals(payment.getStatus())) {
            throw new IllegalStateException("Payment is not in verified state. Current status: " + payment.getStatus());
        }
        if (payment.getSubAdminId() != null) {
            throw new IllegalStateException("This payment has already been used to create a SubAdmin account.");
        }
        return payment;
    }

    /**
     * Marks the payment as used and links it to the newly-created SubAdmin.
     */
    public void markPaymentUsed(Long paymentId, Long subAdminId) {
        Payment payment = paymentRepository.findById(paymentId)
                .orElseThrow(() -> new IllegalArgumentException("Payment not found: " + paymentId));
        payment.setSubAdminId(subAdminId);
        payment.setStatus("used");
        paymentRepository.save(payment);
    }

    // -------------------------------------------------------------------------
    // Private helpers
        /**
         * Returns the most recent payment record linked to a SubAdmin, if any.
         */
        public Optional<Payment> findPaymentBySubAdminId(Long subAdminId) {
            return paymentRepository.findTopBySubAdminIdOrderByVerifiedAtDesc(subAdminId);
        }

    // -------------------------------------------------------------------------

    private boolean isSignatureValid(String orderId, String paymentId, String signature) {
        try {
            String payload = orderId + "|" + paymentId;
            Mac mac = Mac.getInstance("HmacSHA256");
            SecretKeySpec keySpec = new SecretKeySpec(keySecret.getBytes(StandardCharsets.UTF_8), "HmacSHA256");
            mac.init(keySpec);
            byte[] hmac = mac.doFinal(payload.getBytes(StandardCharsets.UTF_8));
            String generated = HexFormat.of().formatHex(hmac);
            return generated.equalsIgnoreCase(signature);
        } catch (Exception e) {
            return false;
        }
    }

    // ─── Renewal ────────────────────────────────────────────────────────

    /**
     * Creates a Razorpay order for subscription renewal.
     * Looks up the user by email and uses their stored subscriptionRate.
     */
    public Map<String, Object> createRenewalOrder(Map<String, Object> body) throws Exception {
        String email = (String) body.get("email");
        com.real_estate.Kunal.Entity.User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));

        String currency = (body.get("currency") != null && !body.get("currency").toString().isBlank())
                ? body.get("currency").toString() : "INR";

        String planType = body.get("planType") != null ? body.get("planType").toString() : "";
        String assignedCity = body.get("assignedCity") != null ? body.get("assignedCity").toString() : null;
        String assignedState = body.get("assignedState") != null ? body.get("assignedState").toString() : null;
        String assignedArea = body.get("assignedArea") != null ? body.get("assignedArea").toString() : null;

        int amountInPaise = calculateRenewalAmountInPaise(planType, assignedCity, assignedState, assignedArea);

        String razorpayOrderId;
        if (keyId == null || keyId.isBlank() || keySecret == null || keySecret.isBlank()) {
            throw new RuntimeException("Razorpay keys are not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET environment variables.");
        } else if (keyId.contains("YourTestKeyId")) {
            razorpayOrderId = "order_mock_" + System.currentTimeMillis();
        } else {
            RazorpayClient client = new RazorpayClient(keyId, keySecret);
            JSONObject orderRequest = new JSONObject();
            orderRequest.put("amount", amountInPaise);
            orderRequest.put("currency", currency);
            orderRequest.put("receipt", "renew_" + user.getId() + "_" + System.currentTimeMillis());
            Order order = client.orders.create(orderRequest);
            razorpayOrderId = order.get("id");
        }

        Payment payment = Payment.builder()
                .razorpayOrderId(razorpayOrderId)
                .amountInPaise((long) amountInPaise)
                .currency(currency)
                .planType(planType)
                .assignedCity(assignedCity)
                .assignedState(assignedState)
                .assignedArea(assignedArea)
                .subscriptionRate((double) amountInPaise / 100)
                .subAdminId(user.getId())
                .status("created")
                .build();
        paymentRepository.save(payment);

        return Map.of(
                "orderId", razorpayOrderId,
                "amountInPaise", amountInPaise,
                "currency", currency,
                "keyId", keyId
        );
    }

    /**
     * Verifies a renewal payment and extends the user's subscription by 1 month.
     */
    public VerifyPaymentResponse verifyRenewalPayment(VerifyPaymentRequest req) {
        // First verify the payment signature
        VerifyPaymentResponse response = verifyPayment(req);
        if (!response.isSuccess()) {
            return response;
        }

        Payment payment = paymentRepository.findByRazorpayOrderId(req.getRazorpayOrderId())
                .orElseThrow(() -> new IllegalArgumentException("Order not found: " + req.getRazorpayOrderId()));

        com.real_estate.Kunal.Entity.User user = userRepository.findById(payment.getSubAdminId())
                .orElseThrow(() -> new RuntimeException("User not found for renewal order"));

        user.setSubscriptionType(payment.getPlanType());
        user.setAssignedCity(payment.getAssignedCity());
        user.setAssignedState(payment.getAssignedState());
        user.setAssignedArea(payment.getAssignedArea());
        user.setSubscriptionRate(payment.getSubscriptionRate());

        java.time.LocalDate currentExpiry = user.getSubscriptionExpiresAt();
        java.time.LocalDate today = java.time.LocalDate.now();

        // If already expired, extend from today; otherwise from current expiry
        java.time.LocalDate baseDate = (currentExpiry != null && currentExpiry.isAfter(today))
                ? currentExpiry : today;
        java.time.LocalDate endDate = baseDate.plusMonths(1);
        user.setSubscriptionStartAt(today);
        user.setSubscriptionExpiresAt(endDate);
        userRepository.save(user);
        subscriptionService.recordRenewal(
                user.getId(),
                payment.getPlanType(),
                payment.getSubscriptionRate(),
                today,
                endDate
        );

        return new VerifyPaymentResponse(true, req.getRazorpayPaymentId(), "Subscription renewed successfully");
    }

    private int calculateRenewalAmountInPaise(String planType, String assignedCity, String assignedState, String assignedArea) {
        if (!"location_based".equalsIgnoreCase(planType) && !"CUSTOM".equalsIgnoreCase(planType)) {
            return 2000000;
        }

        List<String> cities = splitCsv(assignedCity);
        List<String> states = splitCsv(assignedState);
        List<String> areas = splitCsv(assignedArea);
        if (cities.isEmpty() || states.isEmpty()) {
            throw new RuntimeException("At least one city and state are required for location-based renewal");
        }

        double totalRate = 0;
        for (int i = 0; i < cities.size(); i++) {
            String city = cities.get(i);
            String state = states.size() > i ? states.get(i) : states.get(0);
            String area = areas.size() > i ? areas.get(i) : null;
            Location location = null;
            if (area != null && !area.isBlank()) {
                location = locationRepository.findByCityIgnoreCaseAndAreaIgnoreCase(city, area).orElse(null);
            }
            if (location == null || location.getSubscriptionRate() == null) {
                location = locationRepository.findByCityIgnoreCaseAndStateIgnoreCaseAndAreaIsNull(city, state)
                        .orElseThrow(() -> new RuntimeException("No subscription rate found for " + city + ", " + state));
            }
            Double rate = location.getSubscriptionRate();
            if (rate == null || rate <= 0) {
                throw new RuntimeException("Subscription rate not configured for " + city);
            }
            totalRate += rate;
        }
        return (int) Math.round(totalRate * 100);
    }

    private List<String> splitCsv(String raw) {
        List<String> values = new ArrayList<>();
        if (raw == null || raw.isBlank()) {
            return values;
        }
        for (String part : raw.split(",")) {
            String value = part.trim();
            if (!value.isEmpty()) {
                values.add(value);
            }
        }
        return values;
    }
}
