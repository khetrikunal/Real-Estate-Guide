package com.real_estate.Kunal.Service;

import com.real_estate.Kunal.DTO.ChangePasswordRequest;
import com.real_estate.Kunal.DTO.ForgotPasswordResetRequest;
import com.real_estate.Kunal.DTO.ForgotPasswordVerifyOtpRequest;
import com.real_estate.Kunal.Entity.OtpRecord;
import com.real_estate.Kunal.Entity.User;
import com.real_estate.Kunal.Repository.OtpRecordRepository;
import com.real_estate.Kunal.Repository.UserRepository;
import com.real_estate.Kunal.util.JwtUtil;
import io.jsonwebtoken.Claims;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import jakarta.mail.internet.MimeMessage;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;

@Service
@RequiredArgsConstructor
@Slf4j
public class PasswordRecoveryService {

    private static final String PURPOSE_FORGOT_PASSWORD = "forgot_password";
    private static final int MAX_OTP_ATTEMPTS = 5;
    private static final int MAX_OTP_REQUESTS_PER_HOUR = 3;

    private final UserRepository userRepository;
    private final OtpRecordRepository otpRecordRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;
    private final JavaMailSender mailSender;

    @Value("${app.otp.expiry-minutes:10}")
    private int otpExpiryMinutes;

    @Value("${app.mail.from}")
    private String mailFrom;

    // Lightweight in-memory limiter per email. Replace with Redis for distributed deployments.
    private final Map<String, CopyOnWriteArrayList<LocalDateTime>> otpRateLimiter = new ConcurrentHashMap<>();

    @Transactional
    public Map<String, Object> sendOtp(String emailRaw) {
        final String email = normalizeEmail(emailRaw);
        final User user = userRepository.findByEmail(email)
                
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "No account found with this email"));

        enforceRateLimit(email);

        otpRecordRepository.deleteByEmailAndPurposeAndIsUsedFalse(email, PURPOSE_FORGOT_PASSWORD);

        final String otp = generateOtp();
        OtpRecord record = OtpRecord.builder()
                .email(email)
                .otpHash(passwordEncoder.encode(otp))
                .purpose(PURPOSE_FORGOT_PASSWORD)
                .expiresAt(LocalDateTime.now().plusMinutes(otpExpiryMinutes))
                .isUsed(false)
                .attempts(0)
                .build();

        otpRecordRepository.save(record);

        sendEmailAsync(
                email,
                "Your Password Reset OTP - Real Estate Management",
                buildOtpHtml(otp, otpExpiryMinutes)
        );

        Map<String, Object> response = new HashMap<>();
        response.put("message", "OTP sent to " + user.getEmail());
        response.put("expiresIn", otpExpiryMinutes * 60);
        return response;
    }

    @Transactional
    public Map<String, Object> verifyOtp(ForgotPasswordVerifyOtpRequest request) {
        final String email = normalizeEmail(request.getEmail());
        final String otp = Optional.ofNullable(request.getOtp()).orElse("").trim();

        if (otp.length() != 6) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid OTP");
        }

        OtpRecord record = otpRecordRepository
                .findTopByEmailAndPurposeAndIsUsedFalseOrderByCreatedAtDesc(email, PURPOSE_FORGOT_PASSWORD)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "OTP expired. Please request a new one."));

        if (record.getExpiresAt().isBefore(LocalDateTime.now())) {
            record.setIsUsed(true);
            otpRecordRepository.save(record);
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "OTP expired. Please request a new one.");
        }

        int attempts = Optional.ofNullable(record.getAttempts()).orElse(0) + 1;
        record.setAttempts(attempts);

        if (attempts > MAX_OTP_ATTEMPTS) {
            record.setIsUsed(true);
            otpRecordRepository.save(record);
            throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS, "Too many attempts. Request a new OTP.");
        }

        boolean valid = passwordEncoder.matches(otp, record.getOtpHash());
        if (!valid) {
            if (attempts >= MAX_OTP_ATTEMPTS) {
                record.setIsUsed(true);
                otpRecordRepository.save(record);
                throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS, "Too many attempts. Request a new OTP.");
            }
            otpRecordRepository.save(record);
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid OTP. attemptsLeft=" + (MAX_OTP_ATTEMPTS - attempts));
        }

        record.setIsUsed(true);
        otpRecordRepository.save(record);

        User user = userRepository.findByEmail(email)
                
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "No account found with this email"));

        Map<String, Object> claims = new HashMap<>();
        claims.put("purpose", "reset_password");
        claims.put("tokenVersion", user.getTokenVersion());

        String resetToken = jwtUtil.generateTokenWithClaims(email, claims, 15 * 60 * 1000L);

        Map<String, Object> response = new HashMap<>();
        response.put("resetToken", resetToken);
        return response;
    }

    @Transactional
    public Map<String, Object> resetPassword(ForgotPasswordResetRequest request) {
        final String resetToken = Optional.ofNullable(request.getResetToken()).orElse("").trim();
        final String newPassword = Optional.ofNullable(request.getNewPassword()).orElse("");
        final String confirmPassword = Optional.ofNullable(request.getConfirmPassword()).orElse("");

        if (!newPassword.equals(confirmPassword)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Passwords do not match");
        }
        validatePasswordStrength(newPassword);

        Claims claims = jwtUtil.extractAllClaims(resetToken);
        String purpose = claims.get("purpose", String.class);
        if (!"reset_password".equals(purpose)) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid reset token");
        }

        String email = claims.getSubject();
        Long tokenVersion = claims.get("tokenVersion", Long.class);

        User user = userRepository.findByEmail(email)
                
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "No account found with this email"));

        if (!Optional.ofNullable(user.getTokenVersion()).orElse(0L).equals(Optional.ofNullable(tokenVersion).orElse(-1L))) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Reset token is no longer valid");
        }

        user.setPassword(passwordEncoder.encode(newPassword));
        user.setPasswordChangedAt(LocalDateTime.now());
        user.setTokenVersion(Optional.ofNullable(user.getTokenVersion()).orElse(0L) + 1);
        userRepository.save(user);

        sendEmailAsync(
                user.getEmail(),
                "Password Changed - Real Estate Management",
                buildPasswordChangedHtml()
        );

        Map<String, Object> response = new HashMap<>();
        response.put("message", "Password updated successfully");
        return response;
    }

    public Map<String, Object> changePassword(String authenticatedEmail, ChangePasswordRequest request) {
        final String currentPassword = Optional.ofNullable(request.getCurrentPassword()).orElse("");
        final String newPassword = Optional.ofNullable(request.getNewPassword()).orElse("");
        final String confirmPassword = Optional.ofNullable(request.getConfirmPassword()).orElse("");

        if (!newPassword.equals(confirmPassword)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Passwords do not match");
        }

        User user = userRepository.findByEmail(authenticatedEmail)
                
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));

        if (!passwordEncoder.matches(currentPassword, user.getPassword())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Current password is incorrect");
        }

        if (passwordEncoder.matches(newPassword, user.getPassword())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "New password must be different from current");
        }

        validatePasswordStrength(newPassword);

        user.setPassword(passwordEncoder.encode(newPassword));
        user.setPasswordChangedAt(LocalDateTime.now());
        userRepository.save(user);

        Map<String, Object> response = new HashMap<>();
        response.put("message", "Password updated successfully");
        return response;
    }

    private void validatePasswordStrength(String password) {
        boolean strong = password.length() >= 8
                && password.matches(".*[A-Z].*")
                && password.matches(".*[0-9].*")
                && password.matches(".*[^A-Za-z0-9].*");
        if (!strong) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Password must be at least 8 chars with uppercase, number, and special character"
            );
        }
    }

    private void enforceRateLimit(String email) {
        LocalDateTime threshold = LocalDateTime.now().minusHours(1);
        CopyOnWriteArrayList<LocalDateTime> events = otpRateLimiter.computeIfAbsent(email, k -> new CopyOnWriteArrayList<>());
        events.removeIf(t -> t.isBefore(threshold));
        if (events.size() >= MAX_OTP_REQUESTS_PER_HOUR) {
            throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS, "Too many OTP requests. Try again later.");
        }
        events.add(LocalDateTime.now());
    }

    private String normalizeEmail(String email) {
        String value = Optional.ofNullable(email).orElse("").trim().toLowerCase();
        if (value.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Email is required");
        }
        return value;
    }

    private String generateOtp() {
        int number = 100000 + (int) (Math.random() * 900000);
        return String.valueOf(number);
    }

    private void sendEmailAsync(String to, String subject, String htmlBody) {
        CompletableFuture.runAsync(() -> {
            try {
                MimeMessage message = mailSender.createMimeMessage();
                MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
                helper.setFrom(mailFrom);
                helper.setTo(to);
                helper.setSubject(subject);
                helper.setText(htmlBody, true);
                mailSender.send(message);
            } catch (Exception ex) {
                log.error("Failed to send email to {}: {}", to, ex.getMessage());
            }
        });
    }

    private String buildOtpHtml(String otp, int expiryMinutes) {
        return "<h2>Password Reset Request</h2>"
                + "<p>Your OTP is: <strong style='font-size:28px;letter-spacing:8px'>" + otp + "</strong></p>"
                + "<p>This OTP expires in <strong>" + expiryMinutes + " minutes</strong>.</p>"
                + "<p>If you did not request this, ignore this email.</p>";
    }

    private String buildPasswordChangedHtml() {
        return "<h2>Password Updated</h2>"
                + "<p>Your password was successfully changed.</p>"
                + "<p>If this was not you, contact support immediately.</p>";
    }
}


