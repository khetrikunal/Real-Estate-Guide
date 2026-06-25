package com.real_estate.Kunal.Repository;

import com.real_estate.Kunal.Entity.KycDocumentType;
import com.real_estate.Kunal.Entity.UserKycDocument;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface UserKycDocumentRepository extends JpaRepository<UserKycDocument, Long> {
    List<UserKycDocument> findByUserId(Long userId);
    List<UserKycDocument> findByTempRegistrationId(UUID tempRegistrationId);
    Optional<UserKycDocument> findTopByUserIdAndDocumentTypeOrderByUploadedAtDesc(Long userId, KycDocumentType documentType);
    Optional<UserKycDocument> findTopByTempRegistrationIdAndDocumentTypeOrderByUploadedAtDesc(UUID tempRegistrationId, KycDocumentType documentType);
}
