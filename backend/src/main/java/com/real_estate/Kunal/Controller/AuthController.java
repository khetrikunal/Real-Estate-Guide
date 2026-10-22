package com.real_estate.Kunal.Controller;

import com.real_estate.Kunal.DTO.LoginRequest;
import com.real_estate.Kunal.DTO.LoginResponse;
import com.real_estate.Kunal.DTO.ChangePasswordRequest;
import com.real_estate.Kunal.DTO.ForgotPasswordResetRequest;
import com.real_estate.Kunal.DTO.ForgotPasswordSendOtpRequest;
import com.real_estate.Kunal.DTO.ForgotPasswordVerifyOtpRequest;
import com.real_estate.Kunal.DTO.RegisterRequest;
import com.real_estate.Kunal.DTO.UpdateProfileRequest;
import com.real_estate.Kunal.Entity.User;
import com.real_estate.Kunal.Repository.UserRepository;
import com.real_estate.Kunal.Service.AuthService;
import com.real_estate.Kunal.Service.FirebaseCustomTokenService;
import com.real_estate.Kunal.Service.PasswordRecoveryService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;
    private final FirebaseCustomTokenService firebaseCustomTokenService;
    private final PasswordRecoveryService passwordRecoveryService;
    private final UserRepository userRepository;

    @PostMapping("/register")
    public ResponseEntity<?> register(@Valid @RequestBody RegisterRequest request){
        String message = authService.register(request);
        return ResponseEntity.ok(Map.of("message", message));
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@Valid @RequestBody LoginRequest request) {
        User user;
        try {
            user = authService.authenticate(request);
        } catch (RuntimeException ex) {
            if ("SUBSCRIPTION_EXPIRED".equals(ex.getMessage())) {
                // Fetch the user to return renewal details
                User expiredUser = userRepository.findByEmail(request.getEmail())
                        .orElse(null);
                Map<String, Object> body = new HashMap<>();
                body.put("error", "SUBSCRIPTION_EXPIRED");
                body.put("message", "Your subscription has expired. Please renew to continue.");
                if (expiredUser != null) {
                    body.put("email", expiredUser.getEmail());
                    body.put("subscriptionRate", expiredUser.getSubscriptionRate());
                    body.put("assignedCity", expiredUser.getAssignedCity());
                    body.put("assignedArea", expiredUser.getAssignedArea());
                }
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body(body);
            }
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", ex.getMessage() != null ? ex.getMessage() : "Invalid credentials"));
        }
        String token = authService.generateJwt(user);
        String firebaseToken = firebaseCustomTokenService.isInitialized()
            ? firebaseCustomTokenService.createCustomToken(user)
            : null;

        LoginResponse response = LoginResponse.builder()
                .token(token)
                .firebaseToken(firebaseToken)
                .role(user.getRole().name())
                .userId(user.getId())
                .name(user.getName())
                .email(user.getEmail())
                .build();

        return ResponseEntity.ok(response);
    }

    @PostMapping("/refresh-firebase-token")
    public ResponseEntity<?> refreshFirebaseToken(Authentication authentication) {
        if (!firebaseCustomTokenService.isInitialized()) {
            Map<String, Object> error = new HashMap<>();
            error.put("message", "Firebase Admin is not configured on backend");
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body(error);
        }

        String email = authentication.getName();
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new UsernameNotFoundException("User not found"));
        String firebaseToken = firebaseCustomTokenService.createCustomToken(user);
        Map<String, Object> response = new HashMap<>();
        response.put("firebaseToken", firebaseToken);
        return ResponseEntity.ok(response);
    }
    @GetMapping("/me")
    public ResponseEntity<User> getCurrentUser(Authentication authentication) {
        String email = authentication.getName(); // from JWT subject
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new UsernameNotFoundException("User not found"));

        return ResponseEntity.ok(user);
    }

    @PostMapping("/forgot-password/send-otp")
    public ResponseEntity<?> sendForgotPasswordOtp(@Valid @RequestBody ForgotPasswordSendOtpRequest request) {
        return ResponseEntity.ok(passwordRecoveryService.sendOtp(request.getEmail()));
    }

    @PostMapping("/forgot-password/verify-otp")
    public ResponseEntity<?> verifyForgotPasswordOtp(@Valid @RequestBody ForgotPasswordVerifyOtpRequest request) {
        return ResponseEntity.ok(passwordRecoveryService.verifyOtp(request));
    }

    @PostMapping("/forgot-password/reset-password")
    public ResponseEntity<?> resetForgotPassword(@Valid @RequestBody ForgotPasswordResetRequest request) {
        return ResponseEntity.ok(passwordRecoveryService.resetPassword(request));
    }

    @PostMapping("/change-password")
    public ResponseEntity<?> changePassword(@Valid @RequestBody ChangePasswordRequest request,
                                            Authentication authentication) {
        return ResponseEntity.ok(passwordRecoveryService.changePassword(authentication.getName(), request));
    }

    @PutMapping("/update-profile")
    public ResponseEntity<User> updateProfile(@Valid @RequestBody UpdateProfileRequest request,
                                              Authentication authentication) {
        User user = userRepository.findByEmail(authentication.getName())
                .orElseThrow(() -> new UsernameNotFoundException("User not found"));

        if (request.getName() != null && !request.getName().isBlank()) {
            user.setName(request.getName().trim());
        }
        if (request.getPhone() != null) {
            user.setPhone(request.getPhone().trim());
        }
        if (request.getProfilePhotoUrl() != null) {
            user.setProfilePhotoUrl(request.getProfilePhotoUrl().trim());
        }

        return ResponseEntity.ok(userRepository.save(user));
    }

}
