package com.real_estate.Kunal.Entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Table(name = "user_kyc_documents",
        indexes = {
                @Index(name = "idx_kyc_doc_user", columnList = "user_id"),
                @Index(name = "idx_kyc_doc_temp", columnList = "temp_registration_id"),
                @Index(name = "idx_kyc_doc_type", columnList = "document_type")
        })
public class UserKycDocument {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id")
    private Long userId;

    @Column(name = "temp_registration_id")
    private UUID tempRegistrationId;

    @Enumerated(EnumType.STRING)
    @Column(name = "document_type", nullable = false, length = 40)
    private KycDocumentType documentType;

    @Column(name = "object_key", nullable = false, length = 700)
    private String objectKey;

    @Column(name = "content_type", nullable = false, length = 120)
    private String contentType;

    @Column(name = "original_file_name", length = 255)
    private String originalFileName;

    @Column(name = "file_size")
    private Long fileSize;

    @Enumerated(EnumType.STRING)
    @Builder.Default
    @Column(name = "verification_status", nullable = false, length = 20)
    private KycVerificationStatus verificationStatus = KycVerificationStatus.PENDING;

    @CreationTimestamp
    @Column(name = "uploaded_at", updatable = false)
    private LocalDateTime uploadedAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
