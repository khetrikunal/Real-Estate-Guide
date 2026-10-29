package com.real_estate.Kunal.Entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "payments")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Payment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true)
    private String razorpayOrderId;

    private String razorpayPaymentId;
    @com.fasterxml.jackson.annotation.JsonIgnore
    private String razorpaySignature;

    /** Amount in paise (e.g. ₹200 = 20000 paise) */
    private Long amountInPaise;

    @Builder.Default
    private String currency = "INR";

    /** location_based | full */
    private String planType;

    private String assignedCity;
    private String assignedState;
    private String assignedArea;

    /** Monthly subscription rate stored for record */
    private Double subscriptionRate;

    /**
     * Lifecycle statuses:
     *  created          – Razorpay order created, payment not yet received
     *  paid             – Razorpay payment verified via HMAC
     *  failed           – Payment failed / cancelled by user
     *  used             – SubAdmin account successfully created against this payment
     */
    @Builder.Default
    private String status = "created";

    /** Set once the SubAdmin account is created with this payment */
    private Long subAdminId;

    @Builder.Default
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    private LocalDateTime verifiedAt;

    private LocalDateTime renewalAppliedAt;
}
