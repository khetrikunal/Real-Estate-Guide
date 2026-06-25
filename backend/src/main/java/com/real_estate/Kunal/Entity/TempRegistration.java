package com.real_estate.Kunal.Entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "temp_registrations",
       indexes = {
           @Index(name = "idx_temp_reg_expires", columnList = "expiresAt, status"),
           @Index(name = "idx_temp_reg_order", columnList = "razorpayOrderId"),
           @Index(name = "idx_temp_reg_email_status", columnList = "email, status")
       },
       uniqueConstraints = {
           @UniqueConstraint(name = "uk_temp_reg_order", columnNames = "razorpayOrderId")
       })
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TempRegistration {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    // ── Registration details ─────────────────────────────────────────────
    @Column(nullable = false, length = 100)
    private String name;

    @Column(nullable = false, length = 150)
    private String email;

    @Column(nullable = false, length = 255)
    private String passwordHash;

    @Column(length = 20)
    private String phone;

    @Column(length = 512)
    private String profilePhotoUrl;

    @Column(length = 20)
    private String aadhaarNumber;

    @Column(length = 512)
    private String aadhaarCardUrl;

    @Column(length = 20)
    private String panNumber;

    // ── Subscription details ─────────────────────────────────────────────
    /** ALL_LOCATIONS or CUSTOM */
    @Column(nullable = false, length = 30)
    private String planType;

    @Column(length = 100)
    private String state;

    @Column(length = 100)
    private String city;

    @Column(length = 100)
    private String area;

    @Column(length = 1000)
    private String selectedLocationIds;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal subscriptionAmount;

    // ── Payment tracking ─────────────────────────────────────────────────
    @Column(nullable = false, unique = true, length = 100)
    private String razorpayOrderId;

    @Column(length = 100)
    private String razorpayPaymentId;

    @Column(length = 255)
    private String razorpaySignature;

    // ── Status lifecycle ─────────────────────────────────────────────────
    /**
     * PENDING   – order created, awaiting payment
     * PAID      – payment verified, moving to main db
     * COMPLETED – successfully moved to main users table
     * FAILED    – payment failed
     * EXPIRED   – abandoned for more than 24 hours
     */
    @Builder.Default
    @Column(nullable = false, length = 20)
    private String status = "PENDING";

    // ── Security token ───────────────────────────────────────────────────
    @Builder.Default
    @Column(nullable = false)
    private UUID registrationToken = UUID.randomUUID();

    // ── Timestamps ───────────────────────────────────────────────────────
    @CreationTimestamp
    @Column(updatable = false)
    private LocalDateTime createdAt;

    @Builder.Default
    private LocalDateTime expiresAt = LocalDateTime.now().plusHours(24);

    private LocalDateTime completedAt;

    /** Error description if payment failed */
    private String failureReason;
}
