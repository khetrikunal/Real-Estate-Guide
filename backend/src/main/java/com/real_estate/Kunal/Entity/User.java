package com.real_estate.Kunal.Entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Table(name = "users")
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String name;

    @Column(unique = true)
    private String email;

    @com.fasterxml.jackson.annotation.JsonIgnore
    private String password;

    private String phone;

    @Enumerated(EnumType.STRING)
    private Role role;

    /** 'location_based' or 'full' — only relevant for SUB_ADMIN role */
    private String subscriptionType;

    /** @deprecated Legacy geography field. To be dropped in a future release. */
    @Deprecated
    private String assignedCity;

    /** @deprecated Legacy geography field. To be dropped in a future release. */
    @Deprecated
    private String assignedState;

    /** @deprecated Legacy geography field. To be dropped in a future release. */
    @Deprecated
    private String assignedArea;

    /**
     * FK to custom_cities.id — the city scope for location_based SUB_ADMIN users.
     * Replaces the deprecated {@link #assignedCity} string field.
     */
    @Column(name = "custom_city_id")
    private Long customCityId;

    /**
     * FK to areas.id — the area scope for location_based SUB_ADMIN users (optional,
     * narrows within the city). Replaces the deprecated {@link #assignedArea} string field.
     */
    @Column(name = "area_id")
    private Long areaId;

    private Double subscriptionRate;

    /** MANUAL | SELF_SIGNUP */
    private String signupSource;

    /** manual | razorpay */
    private String paymentMethod;

    private Double amountPaid;

    private String razorpayPaymentId;

    private LocalDate subscriptionStartAt;

    private LocalDate subscriptionExpiresAt;

    private Boolean autoRenewal;

    private Long addedBy;

    @Builder.Default
    @com.fasterxml.jackson.annotation.JsonIgnore
    private Long tokenVersion = 0L;

    private LocalDateTime lastLoginAt;

    private LocalDateTime passwordChangedAt;

    private String profilePhotoUrl;

    private String aadhaarNumber;

    private String aadhaarCardUrl;

    private String panNumber;

    @Builder.Default
    private String kycStatus = "PENDING";

    private Long kycVerifiedBy;

    private LocalDateTime kycVerifiedAt;

    private String kycRejectionReason;

    @Builder.Default
    private Boolean isOnline = false;

    private LocalDateTime lastSeen;

    @com.fasterxml.jackson.annotation.JsonIgnore
    private String fcmToken;

    @CreationTimestamp
    @Column(updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;

}
