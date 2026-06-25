package com.real_estate.Kunal.DTO;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
public class UserManagementResponse {
    private Long id;
    private String name;
    private String email;
    private String phone;
    private String role;
    private Boolean isActive;
    private String signupSource;
    private String subscriptionType;
    private String assignedCity;
    private String assignedState;
    private String assignedArea;
    private Double subscriptionRate;
    private LocalDate subscriptionStartAt;
    private LocalDate subscriptionExpiresAt;
    private Boolean autoRenewal;
    private String paymentMethod;
    private Double amountPaid;
    private String razorpayPaymentId;
    private String profilePhotoUrl;
    private String aadhaarNumber;
    private String aadhaarCardUrl;
    private String panNumber;
    private String kycStatus;
    private Long kycVerifiedBy;
    private LocalDateTime kycVerifiedAt;
    private String kycRejectionReason;
    private Long addedBy;
    private LocalDateTime lastLoginAt;
    private LocalDateTime createdAt;
    private List<KycDocumentResponse> kycDocuments;
}
