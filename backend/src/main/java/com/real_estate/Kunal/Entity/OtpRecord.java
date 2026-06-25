package com.real_estate.Kunal.Entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Table(name = "otp_records")
public class OtpRecord {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String email;

    @Column(nullable = false, length = 120)
    private String otpHash;

    @Column(nullable = false)
    private String purpose;

    @Column(nullable = false)
    private LocalDateTime expiresAt;

    @Builder.Default
    private Boolean isUsed = false;

    @Builder.Default
    private Integer attempts = 0;

    @CreationTimestamp
    @Column(updatable = false)
    private LocalDateTime createdAt;
}
