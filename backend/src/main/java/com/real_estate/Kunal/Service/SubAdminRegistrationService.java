package com.real_estate.Kunal.Service;

import com.razorpay.Order;
import com.razorpay.RazorpayClient;
import com.real_estate.Kunal.DTO.*;
import com.real_estate.Kunal.Entity.Location;
import com.real_estate.Kunal.Entity.Role;
import com.real_estate.Kunal.Entity.TempRegistration;
import com.real_estate.Kunal.Entity.User;
import com.real_estate.Kunal.Repository.LocationRepository;
import com.real_estate.Kunal.Repository.TempRegistrationRepository;
import com.real_estate.Kunal.Repository.UserRepository;
import com.real_estate.Kunal.util.JwtUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.json.JSONObject;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.HexFormat;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class SubAdminRegistrationService {

    private final TempRegistrationRepository tempRepo;
    private final UserRepository userRepository;
    private final LocationRepository locationRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;
    private final KycDocumentService kycDocumentService;

    @Value("${razorpay.key.id}")
    private String razorpayKeyId;

    @Value("${razorpay.key.secret}")
    private String razorpayKeySecret;

    @Value("${razorpay.webhook.secret:}")
    private String razorpayWebhookSecret;

    // ─── Endpoint 1: Initiate Registration ─────────────────────────────────

    public InitiateRegistrationResponse initiateRegistration(InitiateRegistrationRequest req) throws Exception {
        String email = req.getEmail().trim().toLowerCase();

        if (razorpayKeyId == null || razorpayKeyId.isBlank()
                || razorpayKeySecret == null || razorpayKeySecret.isBlank()) {
            throw new IllegalStateException("Razorpay is not configured. Please contact support.");
        }

        // 1. Check main users table
        if (userRepository.findByEmail(email).isPresent()) {
            throw new IllegalStateException("Email already registered. Please log in.");
        }

        // 2. Check temp_registrations for existing PENDING/PAID
        var existing = tempRepo.findFirstByEmailIgnoreCaseAndStatusIn(email, List.of("PENDING", "PAID"));
        if (existing.isPresent()) {
            TempRegistration temp = existing.get();
            if (temp.getExpiresAt().isAfter(LocalDateTime.now())) {
                // Not expired — return existing order for resume
                int amountInPaise = temp.getSubscriptionAmount().multiply(BigDecimal.valueOf(100)).intValue();
                return InitiateRegistrationResponse.builder()
                        .registrationToken(temp.getRegistrationToken().toString())
                        .razorpayOrderId(temp.getRazorpayOrderId())
                        .amountInPaise(amountInPaise)
                        .amountInRupees(temp.getSubscriptionAmount().doubleValue())
                        .planType(temp.getPlanType())
                        .razorpayKeyId(razorpayKeyId)
                        .resumePayment(true)
                        .build();
            }
            // Expired — delete and let user re-register
            tempRepo.delete(temp);
        }

        // 3. Delete any FAILED/EXPIRED records for this email
        tempRepo.findFirstByEmailIgnoreCaseAndStatusIn(email, List.of("FAILED", "EXPIRED"))
                .ifPresent(tempRepo::delete);

        // 4. Validate plan type and get amount server-side
        String planType = req.getPlanType();
        if (planType == null || planType.isBlank()) {
            throw new IllegalArgumentException("planType is required (ALL_LOCATIONS or CUSTOM)");
        }

        BigDecimal subscriptionAmount;
        String selectedLocationIds = null;
        if ("CUSTOM".equalsIgnoreCase(planType) || "LOCATION_BASED".equalsIgnoreCase(planType) || "location_based".equalsIgnoreCase(planType)) {
            List<Location> selectedLocations = resolveSelectedLocations(req);
            subscriptionAmount = selectedLocations.stream()
                    .map(location -> BigDecimal.valueOf(location.getSubscriptionRate()))
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
            selectedLocationIds = String.join(",", selectedLocations.stream()
                    .map(location -> String.valueOf(location.getId()))
                    .toList());
            req.setState(joinDistinct(selectedLocations.stream().map(Location::getState).toList()));
            req.setCity(joinDistinct(selectedLocations.stream().map(Location::getCity).toList()));
            req.setArea(joinDistinct(selectedLocations.stream().map(Location::getArea).toList()));
            planType = "location_based";
        } else {
            // Full / ALL_LOCATIONS — default ₹20,000
            subscriptionAmount = BigDecimal.valueOf(20000);
            planType = "full";
        }

        // 5. Hash password
        requireKyc(req.getAadhaarNumber(), req.getPanNumber());
        String passwordHash = passwordEncoder.encode(req.getPassword());

        // 6. Create Razorpay order
        int amountInPaise = subscriptionAmount.multiply(BigDecimal.valueOf(100)).intValue();
        String razorpayOrderId;

        if (razorpayKeyId.contains("YourTestKeyId")) {
            razorpayOrderId = "order_mock_" + System.currentTimeMillis();
        } else {
            RazorpayClient client = new RazorpayClient(razorpayKeyId, razorpayKeySecret);
            JSONObject orderRequest = new JSONObject();
            orderRequest.put("amount", amountInPaise);
            orderRequest.put("currency", "INR");
            orderRequest.put("receipt", "reg_" + System.currentTimeMillis());
            Order order = client.orders.create(orderRequest);
            razorpayOrderId = order.get("id");
        }

        // 7. Save temp registration
        TempRegistration temp = TempRegistration.builder()
                .name(req.getName().trim())
                .email(email)
                .passwordHash(passwordHash)
                .phone(req.getPhone())
                .profilePhotoUrl(blankToNull(req.getProfilePhotoUrl()))
                .aadhaarNumber(blankToNull(req.getAadhaarNumber()))
                .panNumber(normalizedPan(req.getPanNumber()))
                .planType(planType)
                .state(req.getState())
                .city(req.getCity())
                .area(req.getArea())
                .selectedLocationIds(selectedLocationIds)
                .subscriptionAmount(subscriptionAmount)
                .razorpayOrderId(razorpayOrderId)
                .status("PENDING")
                .build();

        tempRepo.save(temp);

        return InitiateRegistrationResponse.builder()
                .registrationToken(temp.getRegistrationToken().toString())
                .razorpayOrderId(razorpayOrderId)
                .amountInPaise(amountInPaise)
                .amountInRupees(subscriptionAmount.doubleValue())
                .planType(planType)
                .razorpayKeyId(razorpayKeyId)
                .resumePayment(false)
                .build();
    }

    // ─── Endpoint 2: Razorpay Webhook ──────────────────────────────────────

    public void handleWebhookPayment(String orderId, String paymentId, String rawBody, String signatureHeader) {
        // Verify webhook signature
        if (razorpayWebhookSecret != null && !razorpayWebhookSecret.isBlank()) {
            if (!verifyWebhookSignature(rawBody, signatureHeader)) {
                log.warn("Webhook signature verification failed for order {}", orderId);
                throw new SecurityException("Invalid webhook signature");
            }
        }

        TempRegistration temp = tempRepo.findByRazorpayOrderId(orderId).orElse(null);
        if (temp == null) {
            log.info("Webhook received for unknown order {}. Possibly already processed or not a registration order.", orderId);
            return; // Idempotent — not our order or already cleaned up
        }

        if ("COMPLETED".equals(temp.getStatus())) {
            log.info("Webhook for order {} — already completed. Ignoring.", orderId);
            return; // Already processed
        }

        temp.setRazorpayPaymentId(paymentId);
        temp.setStatus("PAID");
        tempRepo.save(temp);

        try {
            promoteToUser(temp);
        } catch (Exception e) {
            log.error("Webhook: failed to promote temp registration {} to user: {}", temp.getId(), e.getMessage());
            // Leave in PAID status — scheduler will retry
        }
    }

    // ─── Endpoint 3: Verify and Complete (frontend fast path) ──────────────

    public RegistrationStatusResponse verifyAndComplete(VerifyAndCompleteRequest req) {
        UUID token;
        try {
            token = UUID.fromString(req.getRegistrationToken());
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("Invalid registration token");
        }

        TempRegistration temp = tempRepo.findByRegistrationToken(token)
                .orElseThrow(() -> new IllegalArgumentException("Registration not found"));

        // If already completed, return JWT immediately
        if ("COMPLETED".equals(temp.getStatus())) {
            return buildCompletedResponse(temp);
        }

        if ("PAID".equals(temp.getStatus())
                && req.getRazorpayPaymentId() != null
                && req.getRazorpayPaymentId().equals(temp.getRazorpayPaymentId())) {
            promoteToUser(temp);
            temp = tempRepo.findByRegistrationToken(token).orElse(temp);
            return buildCompletedResponse(temp);
        }

        // Verify Razorpay payment signature
        if (!verifyPaymentSignature(req.getRazorpayOrderId(), req.getRazorpayPaymentId(), req.getRazorpaySignature())) {
            throw new SecurityException("Payment signature verification failed");
        }

        // Update payment details
        temp.setRazorpayPaymentId(req.getRazorpayPaymentId());
        temp.setRazorpaySignature(req.getRazorpaySignature());
        temp.setStatus("PAID");
        tempRepo.save(temp);

        // Promote to main user
        try {
            promoteToUser(temp);
        } catch (DataIntegrityViolationException e) {
            // Race condition: webhook already created the user
            log.info("verify-and-complete: user already created by webhook for {}", temp.getEmail());
            temp = tempRepo.findByRegistrationToken(token).orElse(temp);
        }

        return buildCompletedResponse(temp);
    }

    // ─── Endpoint 4: Registration Status Polling ───────────────────────────

    public RegistrationStatusResponse getRegistrationStatus(String tokenStr) {
        UUID token;
        try {
            token = UUID.fromString(tokenStr);
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("Invalid registration token");
        }

        TempRegistration temp = tempRepo.findByRegistrationToken(token)
                .orElseThrow(() -> new IllegalArgumentException("Registration not found"));

        if ("COMPLETED".equals(temp.getStatus())) {
            return buildCompletedResponse(temp);
        }

        return RegistrationStatusResponse.builder()
                .status(temp.getStatus())
                .build();
    }

    // ─── Endpoint 5: Mark Failed ───────────────────────────────────────────

    public void markFailed(String tokenStr, String errorDescription) {
        UUID token;
        try {
            token = UUID.fromString(tokenStr);
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("Invalid registration token");
        }

        TempRegistration temp = tempRepo.findByRegistrationToken(token)
                .orElseThrow(() -> new IllegalArgumentException("Registration not found"));

        if ("COMPLETED".equals(temp.getStatus()) || "PAID".equals(temp.getStatus())) {
            return; // Payment already succeeded — cannot fail from late modal dismiss
        }

        temp.setStatus("FAILED");
        temp.setFailureReason(errorDescription);
        tempRepo.save(temp);
    }

    // ─── Email Availability Check ──────────────────────────────────────────

    public boolean isEmailAvailable(String email) {
        email = email.trim().toLowerCase();
        // Check main users table
        if (userRepository.findByEmail(email).isPresent()) {
            return false;
        }
        // Check pending/paid temp registrations
        return !tempRepo.existsByEmailIgnoreCaseAndStatusIn(email, List.of("PENDING", "PAID"));
    }

    // ─── Core Promotion Logic ──────────────────────────────────────────────

    @Transactional(isolation = Isolation.SERIALIZABLE)
    public void promoteToUser(TempRegistration temp) {
        // Re-read inside transaction
        temp = tempRepo.findById(temp.getId()).orElseThrow();

        if ("COMPLETED".equals(temp.getStatus())) {
            return; // Already promoted
        }

        kycDocumentService.ensureTempHasRequiredDocuments(temp.getId());

        // Create the actual User record
        User user = User.builder()
                .name(temp.getName())
                .email(temp.getEmail())
                .password(temp.getPasswordHash()) // Already BCrypt-hashed
                .phone(temp.getPhone())
                .role(Role.SUB_ADMIN)
                .subscriptionType(temp.getPlanType())
                .assignedCity(temp.getCity())
                .assignedState(temp.getState())
                .assignedArea(temp.getArea())
                .subscriptionRate(temp.getSubscriptionAmount().doubleValue())
                .signupSource("SELF_SIGNUP")
                .paymentMethod("razorpay")
                .amountPaid(temp.getSubscriptionAmount().doubleValue())
                .razorpayPaymentId(temp.getRazorpayPaymentId())
                .subscriptionStartAt(LocalDate.now())
                .subscriptionExpiresAt(LocalDate.now().plusMonths(1))
                .autoRenewal(false)
                .profilePhotoUrl(temp.getProfilePhotoUrl())
                .aadhaarNumber(temp.getAadhaarNumber())
                .panNumber(temp.getPanNumber())
                .kycStatus("PENDING")
                .build();

        try {
            userRepository.save(user);
            kycDocumentService.transferTempDocumentsToUser(temp.getId(), user.getId());
        } catch (DataIntegrityViolationException e) {
            // Race condition: duplicate email — find the existing user
            User existingUser = userRepository.findByEmail(temp.getEmail())
                    .orElseThrow(() -> e); // If truly not found, re-throw
            log.info("User {} already exists (id={}). Marking temp as COMPLETED.", temp.getEmail(), existingUser.getId());
            temp.setStatus("COMPLETED");
            temp.setCompletedAt(LocalDateTime.now());
            tempRepo.save(temp);
            return;
        }

        // Mark temp as completed
        temp.setStatus("COMPLETED");
        temp.setCompletedAt(LocalDateTime.now());
        tempRepo.save(temp);

        log.info("Successfully promoted temp registration {} to user {} (id={})",
                temp.getId(), user.getEmail(), user.getId());
    }

    // ─── Private Helpers ───────────────────────────────────────────────────

    private RegistrationStatusResponse buildCompletedResponse(TempRegistration temp) {
        User user = userRepository.findByEmail(temp.getEmail())
                .orElseThrow(() -> new IllegalStateException("User not found after registration completion"));

        String jwt = jwtUtil.generateToken(user.getEmail(), user.getRole().name(), user.getId());

        return RegistrationStatusResponse.builder()
                .status("COMPLETED")
                .token(jwt)
                .userId(user.getId())
                .name(user.getName())
                .email(user.getEmail())
                .role(user.getRole().name())
                .build();
    }

    private boolean verifyPaymentSignature(String orderId, String paymentId, String signature) {
        try {
            String payload = orderId + "|" + paymentId;
            Mac mac = Mac.getInstance("HmacSHA256");
            SecretKeySpec keySpec = new SecretKeySpec(
                    razorpayKeySecret.getBytes(StandardCharsets.UTF_8), "HmacSHA256");
            mac.init(keySpec);
            byte[] hmac = mac.doFinal(payload.getBytes(StandardCharsets.UTF_8));
            String generated = HexFormat.of().formatHex(hmac);
            return generated.equalsIgnoreCase(signature);
        } catch (Exception e) {
            log.error("Payment signature verification error: {}", e.getMessage());
            return false;
        }
    }

    private boolean verifyWebhookSignature(String body, String signatureHeader) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            SecretKeySpec keySpec = new SecretKeySpec(
                    razorpayWebhookSecret.getBytes(StandardCharsets.UTF_8), "HmacSHA256");
            mac.init(keySpec);
            byte[] hmac = mac.doFinal(body.getBytes(StandardCharsets.UTF_8));
            String generated = HexFormat.of().formatHex(hmac);
            return generated.equalsIgnoreCase(signatureHeader);
        } catch (Exception e) {
            log.error("Webhook signature verification error: {}", e.getMessage());
            return false;
        }
    }

    private List<Location> resolveSelectedLocations(InitiateRegistrationRequest req) {
        List<Location> locations;
        if (req.getLocationIds() != null && !req.getLocationIds().isEmpty()) {
            locations = locationRepository.findAllById(req.getLocationIds());
            if (locations.size() != req.getLocationIds().size()) {
                throw new IllegalArgumentException("One or more selected locations were not found");
            }
        } else {
            if (req.getCity() == null || req.getCity().isBlank()) {
                throw new IllegalArgumentException("At least one location is required for location-based plan");
            }
            if (req.getState() == null || req.getState().isBlank()) {
                throw new IllegalArgumentException("State is required for location-based plan");
            }
            Location location = null;
            if (req.getArea() != null && !req.getArea().isBlank()) {
                location = locationRepository
                        .findByCityIgnoreCaseAndAreaIgnoreCase(req.getCity(), req.getArea())
                        .orElse(null);
            }
            if (location == null || location.getSubscriptionRate() == null) {
                location = locationRepository
                        .findByCityIgnoreCaseAndStateIgnoreCaseAndAreaIsNull(req.getCity(), req.getState())
                        .orElseThrow(() -> new IllegalArgumentException(
                                "No subscription rate found for " + req.getCity() + ", " + req.getState()));
            }
            locations = List.of(location);
        }

        if (locations.isEmpty()) {
            throw new IllegalArgumentException("At least one location is required for location-based plan");
        }
        for (Location location : locations) {
            Double rate = location.getSubscriptionRate();
            if (rate == null || rate <= 0) {
                throw new IllegalArgumentException("Subscription rate not configured for " + location.getLocationName());
            }
        }
        return locations;
    }

    private String joinDistinct(List<String> values) {
        String joined = String.join(",", values.stream()
                .filter(value -> value != null && !value.isBlank())
                .map(String::trim)
                .distinct()
                .toList());
        return joined.isBlank() ? null : joined;
    }

    private String blankToNull(String value) {
        return value == null || value.trim().isEmpty() ? null : value.trim();
    }

    private String normalizedPan(String value) {
        String normalized = blankToNull(value);
        return normalized != null ? normalized.toUpperCase() : null;
    }

    private void requireKyc(String aadhaarNumber, String panNumber) {
        String normalizedAadhaar = blankToNull(aadhaarNumber);
        String normalizedPanValue = normalizedPan(panNumber);
        if (normalizedAadhaar == null) {
            throw new IllegalArgumentException("aadhaarNumber is required");
        }
        if (!normalizedAadhaar.matches("^[0-9]{12}$")) {
            throw new IllegalArgumentException("aadhaarNumber must be exactly 12 digits");
        }
        if (normalizedPanValue == null) {
            throw new IllegalArgumentException("panNumber is required");
        }
        if (!normalizedPanValue.matches("^[A-Z]{3}[PCHFTABGJL][A-Z][0-9]{4}[A-Z]$")) {
            throw new IllegalArgumentException("panNumber format is invalid");
        }
    }
}

