package com.real_estate.Kunal.DTO;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.time.LocalDate;

@Data
public class CreateUserRequest {

    @NotBlank(message = "Name is required")
    @Size(max = 120, message = "Name is too long")
    private String name;

    @NotBlank(message = "Email is required")
    @Email(message = "Email must be valid")
    private String email;

    @NotBlank(message = "Password is required")
    @Size(min = 8, max = 128, message = "Password must be between 8 and 128 characters")
    private String password;
    private String phone;

    /** SubAdmin-specific fields */
    private String subscriptionType;
    private String assignedCity;
    private String assignedState;
    private String assignedArea;
    private Double subscriptionRate;

    /** Required for SubAdmin creation — must reference a verified Razorpay payment */
    private String razorpayPaymentId;

    /** Optional for SuperAdmin-managed manual onboarding */
    private String paymentMethod;
    private Double amountPaid;
    private LocalDate subscriptionStartAt;
    private LocalDate subscriptionExpiresAt;
    private Boolean autoRenewal;
    private String notes;

    /** For employee ownership under admin */
    private Long adminId;

    /** For manual creation audit */
    private Long addedBy;

    private String signupSource;

    private String profilePhotoUrl;
    private String aadhaarNumber;
    private String aadhaarCardUrl;
    private String panNumber;
    private String kycStatus;

}
