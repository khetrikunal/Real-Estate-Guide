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
import org.springframework.transaction.annotation.Transactional;

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
    private final LocationService locationService;
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
        String currency = currency(body);

        String razorpayOrderId;
        int amountInPaise;
        String planType = normalizePlan(body.get("planType"));
        String assignedCity = body.get("assignedCity") != null ? body.get("assignedCity").toString() : null;
        String assignedState = body.get("assignedState") != null ? body.get("assignedState").toString() : null;
        String assignedArea = body.get("assignedArea") != null ? body.get("assignedArea").toString() : null;

        amountInPaise = calculateRenewalAmountInPaise(planType, assignedCity, assignedState, assignedArea);

        razorpayOrderId = createGatewayOrder(amountInPaise, currency, "sub_" + System.currentTimeMillis());

        Payment payment = Payment.builder()
                .razorpayOrderId(razorpayOrderId)
                .amountInPaise((long) amountInPaise)
                .currency(currency)
                .planType(planType)
                .assignedCity(assignedCity)
                .assignedState(assignedState)
                .assignedArea(assignedArea)
                .subscriptionRate(amountInPaise / 100.0)
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
    @Transactional
    public VerifyPaymentResponse verifyPayment(VerifyPaymentRequest req) {
        Payment payment = paymentRepository.findByOrderIdForUpdate(req.getRazorpayOrderId())
                .orElseThrow(() -> new IllegalArgumentException("Order not found: " + req.getRazorpayOrderId()));

        if (!isSignatureValid(req.getRazorpayOrderId(), req.getRazorpayPaymentId(), req.getRazorpaySignature())) {
            return new VerifyPaymentResponse(false, null, "Signature verification failed");
        }
        if ("paid".equals(payment.getStatus()) || "used".equals(payment.getStatus())) {
            if (!java.util.Objects.equals(payment.getRazorpayPaymentId(), req.getRazorpayPaymentId())) {
                return new VerifyPaymentResponse(false, null, "Payment does not match this order");
            }
            return new VerifyPaymentResponse(true, payment.getRazorpayPaymentId(), "Already verified");
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
    @Transactional
    public Payment getVerifiedPayment(String razorpayPaymentId) {
        Payment payment = paymentRepository.findByPaymentIdForUpdate(razorpayPaymentId)
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
    @Transactional
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
            return signature != null && java.security.MessageDigest.isEqual(
                    generated.getBytes(StandardCharsets.UTF_8), signature.getBytes(StandardCharsets.UTF_8));
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

        if (user.getRole() != com.real_estate.Kunal.Entity.Role.SUB_ADMIN) {
            throw new IllegalArgumentException("Only Sub Admin subscriptions can be renewed");
        }
        String currency = currency(body);

        String planType = normalizePlan(body.get("planType"));
        String assignedCity = body.get("assignedCity") != null ? body.get("assignedCity").toString() : null;
        String assignedState = body.get("assignedState") != null ? body.get("assignedState").toString() : null;
        String assignedArea = body.get("assignedArea") != null ? body.get("assignedArea").toString() : null;

        int amountInPaise = calculateRenewalAmountInPaise(planType, assignedCity, assignedState, assignedArea);

        String razorpayOrderId;
        razorpayOrderId = createGatewayOrder(amountInPaise, currency, "renew_" + user.getId() + "_" + System.currentTimeMillis());

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
    @Transactional
    public VerifyPaymentResponse verifyRenewalPayment(VerifyPaymentRequest req) {
        // First verify the payment signature
        VerifyPaymentResponse response = verifyPayment(req);
        if (!response.isSuccess()) {
            return response;
        }

        Payment payment = paymentRepository.findByOrderIdForUpdate(req.getRazorpayOrderId())
                .orElseThrow(() -> new IllegalArgumentException("Order not found: " + req.getRazorpayOrderId()));

        if (payment.getSubAdminId() == null || "used".equals(payment.getStatus())) {
            throw new IllegalArgumentException("Order is not an unused renewal order");
        }
        if (payment.getRenewalAppliedAt() != null) {
            return new VerifyPaymentResponse(true, payment.getRazorpayPaymentId(), "Renewal already applied");
        }

        com.real_estate.Kunal.Entity.User user = userRepository.findByIdForUpdate(payment.getSubAdminId())
                .orElseThrow(() -> new RuntimeException("User not found for renewal order"));

        user.setSubscriptionType(payment.getPlanType());
        // Stopped writing to deprecated user.assignedCity, assignedState, assignedArea (Phase 4)
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
        payment.setRenewalAppliedAt(LocalDateTime.now());
        paymentRepository.save(payment);

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
            Double rate = locationService.getLocationRate(city, state, area)
                    .orElseThrow(() -> new RuntimeException("No subscription rate found for " + city + (area != null ? ", " + area : "")));
            if (!Double.isFinite(rate) || rate <= 0) {
                throw new RuntimeException("Subscription rate not configured for " + city);
            }
            totalRate += rate;
        }
        long amount = java.math.BigDecimal.valueOf(totalRate).movePointRight(2)
                .setScale(0, java.math.RoundingMode.HALF_UP).longValueExact();
        if (amount <= 0 || amount > Integer.MAX_VALUE) throw new IllegalArgumentException("Invalid subscription rate");
        return (int) amount;
    }

    protected String createGatewayOrder(int amount, String currency, String receipt) throws Exception {
        if (keyId == null || keyId.isBlank() || keySecret == null || keySecret.isBlank()
                || keyId.contains("YourTestKeyId")) {
            throw new IllegalStateException("Razorpay keys are not configured");
        }
        RazorpayClient client = new RazorpayClient(keyId, keySecret);
        JSONObject order = new JSONObject();
        order.put("amount", amount);
        order.put("currency", currency);
        order.put("receipt", receipt);
        return client.orders.create(order).get("id");
    }

    private String normalizePlan(Object raw) {
        String plan = raw == null ? "full" : raw.toString().trim().toLowerCase(java.util.Locale.ROOT);
        return switch (plan) {
            case "full", "all", "all_locations" -> "full";
            case "custom", "location_based" -> "location_based";
            default -> throw new IllegalArgumentException("Invalid subscription plan");
        };
    }

    private String currency(Map<String, Object> body) {
        String currency = body.getOrDefault("currency", "INR").toString();
        if (!"INR".equals(currency)) throw new IllegalArgumentException("Subscriptions must be paid in INR");
        return currency;
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
