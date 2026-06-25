package com.real_estate.Kunal.DTO;

import com.real_estate.Kunal.Entity.KycDocumentType;
import com.real_estate.Kunal.Entity.KycVerificationStatus;
import lombok.Builder;
import lombok.Value;

import java.time.LocalDateTime;
import java.util.UUID;

@Value
@Builder
public class KycDocumentResponse {
    Long id;
    Long userId;
    UUID tempRegistrationId;
    KycDocumentType documentType;
    String contentType;
    String originalFileName;
    Long fileSize;
    KycVerificationStatus verificationStatus;
    LocalDateTime uploadedAt;
}
