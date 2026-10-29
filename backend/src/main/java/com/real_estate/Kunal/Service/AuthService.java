package com.real_estate.Kunal.Service;

import com.real_estate.Kunal.DTO.LoginRequest;
import com.real_estate.Kunal.DTO.RegisterRequest;
import com.real_estate.Kunal.Entity.Role;
import com.real_estate.Kunal.Entity.User;
import com.real_estate.Kunal.Repository.UserRepository;
import com.real_estate.Kunal.util.JwtUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;

import com.real_estate.Kunal.Entity.Payment;
import com.real_estate.Kunal.Repository.PaymentRepository;
import java.time.LocalDate;
import java.util.Locale;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;
    private final PaymentService paymentService;
    private final PaymentRepository paymentRepository;

    @Value("${app.security.enable-dev-fallbacks:false}")
    private boolean enableDevFallbacks;

    @org.springframework.security.access.prepost.PreAuthorize("hasRole('SUPER_ADMIN')")
    @org.springframework.transaction.annotation.Transactional
    public String register(RegisterRequest request){
        if (userRepository.findByEmail(request.getEmail()).isPresent()) {
            throw new RuntimeException("Email already registered");
        }

        User user = User.builder()
                .name(request.getName())
                .email(request.getEmail())
                .password(passwordEncoder.encode(request.getPassword()))
                .role(Role.valueOf(request.getRole()))
                .signupSource("SELF_SIGNUP")
                .build();

        userRepository.save(user);

        if (request.getRazorpayPaymentId() != null && !request.getRazorpayPaymentId().isBlank() && user.getRole() == Role.SUB_ADMIN) {
            Payment payment = paymentService.getVerifiedPayment(request.getRazorpayPaymentId());

            user.setSubscriptionType(payment.getPlanType());
            // Stopped writing to deprecated user.assignedCity, assignedState, assignedArea (Phase 4)
            user.setSubscriptionRate(payment.getSubscriptionRate());
            user.setRazorpayPaymentId(payment.getRazorpayPaymentId());
            user.setPaymentMethod("razorpay");
            user.setAmountPaid(payment.getAmountInPaise() != null ? payment.getAmountInPaise() / 100.0 : 0.0);
            user.setSubscriptionStartAt(LocalDate.now());
            user.setSubscriptionExpiresAt(LocalDate.now().plusMonths(1));
            user.setAutoRenewal(true);

            userRepository.save(user);

            payment.setSubAdminId(user.getId());
            payment.setStatus("used");
            paymentRepository.save(payment);
        }

        return "User Registered Successfully";
    }

    public User authenticate(LoginRequest request){
        String loginIdentifier = resolveLoginIdentifier(request);

        User user = userRepository.findByEmail(loginIdentifier)
                .orElseThrow(() -> new RuntimeException("User not found"));

        boolean isPasswordMatch = passwordEncoder.matches(
                request.getPassword(),
                user.getPassword()
        );

        if (!isPasswordMatch) {
            throw new RuntimeException("Invalid password");
        }

        // Legacy clients may supply a role, but the shared login only needs credentials.
        if (request.getRole() != null && !request.getRole().isBlank()) {
            Role requestedRole;
            try {
                requestedRole = Role.valueOf(request.getRole().trim().toUpperCase(Locale.ROOT));
            } catch (IllegalArgumentException e) {
                throw new RuntimeException("Invalid role specified: " + request.getRole());
            }
            if (user.getRole() != requestedRole) {
                throw new RuntimeException("Selected role does not match this account");
            }
        }

        user.setLastLoginAt(LocalDateTime.now());
        userRepository.save(user);

        return user;
    }

    public String generateJwt(User user) {
        return jwtUtil.generateToken(user.getEmail(), user.getRole().name(), user.getId(), user.getTokenVersion());
    }

    private String resolveLoginIdentifier(LoginRequest request) {
        String email = request.getEmail() != null ? request.getEmail().trim() : "";
        if (!"sherry".equalsIgnoreCase(email)) {
            return email;
        }
        if (!enableDevFallbacks) {
            return email;
        }

        String requestedRole = request.getRole() != null
                ? request.getRole().trim().toUpperCase(Locale.ROOT)
                : "";

        return switch (requestedRole) {
            case "SUPER_ADMIN" -> "super@sherry.com";
            case "ADMIN" -> "admin@sherry.com";
            case "SUB_ADMIN" -> "sub@sherry.com";
            case "EMPLOYEE" -> "employee@sherry.com";
            default -> "sherry";
        };
    }

}
