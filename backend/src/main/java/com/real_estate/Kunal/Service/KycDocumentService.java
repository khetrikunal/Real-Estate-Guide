package com.real_estate.Kunal.Service;

import com.real_estate.Kunal.DTO.KycDocumentResponse;
import com.real_estate.Kunal.Entity.*;
import com.real_estate.Kunal.Repository.TempRegistrationRepository;
import com.real_estate.Kunal.Repository.UserKycDocumentRepository;
import com.real_estate.Kunal.Repository.UserRepository;
import com.real_estate.Kunal.Security.FileUploadSecurityValidator;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class KycDocumentService {

    private final ObjectStorageService objectStorageService;
    private final FileUploadSecurityValidator fileUploadSecurityValidator;
    private final UserKycDocumentRepository documentRepository;
    private final TempRegistrationRepository tempRegistrationRepository;
    private final UserRepository userRepository;

    @Transactional
    public KycDocumentResponse uploadForTemp(String token, KycDocumentType documentType, MultipartFile file) throws IOException {
        UUID registrationToken = parseUuid(token);
        TempRegistration temp = tempRegistrationRepository.findByRegistrationToken(registrationToken)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Registration not found"));
        if (!"PENDING".equals(temp.getStatus()) && !"PAID".equals(temp.getStatus())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Registration is not accepting uploads");
        }
        return toResponse(storeDocument(null, temp.getId(), "temp-" + temp.getId(), documentType, file));
    }

    @Transactional
    public KycDocumentResponse uploadForUser(Long userId, KycDocumentType documentType, MultipartFile file) throws IOException {
        User target = userRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
        User current = currentUser();
        if (current == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Authentication required");
        }
        if (!canManageUserDocuments(current, target) && !current.getId().equals(target.getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Not allowed to upload KYC documents for this user");
        }
        return toResponse(storeDocument(userId, null, "user-" + userId, documentType, file));
    }

    public ObjectStorageService.StoredObject loadAuthorizedDocument(Long documentId) throws IOException {
        UserKycDocument document = documentRepository.findById(documentId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Document not found"));
        User current = currentUser();
        if (current == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Authentication required");
        }
        if (!canReadDocument(current, document)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Not allowed to read this document");
        }
        return objectStorageService.loadKycDocument(document.getObjectKey());
    }

    public UserKycDocument getDocument(Long documentId) {
        return documentRepository.findById(documentId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Document not found"));
    }

    @Transactional
    public void transferTempDocumentsToUser(UUID tempRegistrationId, Long userId) {
        List<UserKycDocument> docs = documentRepository.findByTempRegistrationId(tempRegistrationId);
        for (UserKycDocument doc : docs) {
            doc.setUserId(userId);
            doc.setTempRegistrationId(null);
            documentRepository.save(doc);
        }
    }

    public void ensureTempHasRequiredDocuments(UUID tempRegistrationId) {
        if (!hasTempDocument(tempRegistrationId, KycDocumentType.PAN_CARD)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Missing required KYC document: PAN_CARD");
        }

        boolean hasLegacyAadhaar = hasTempDocument(tempRegistrationId, KycDocumentType.AADHAAR_CARD);
        boolean hasAadhaarFrontAndBack = hasTempDocument(tempRegistrationId, KycDocumentType.AADHAAR_FRONT)
                && hasTempDocument(tempRegistrationId, KycDocumentType.AADHAAR_BACK);
        if (!hasLegacyAadhaar && !hasAadhaarFrontAndBack) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Missing required KYC document: AADHAAR_CARD");
        }
    }

    private boolean hasTempDocument(UUID tempRegistrationId, KycDocumentType type) {
        return documentRepository
                .findTopByTempRegistrationIdAndDocumentTypeOrderByUploadedAtDesc(tempRegistrationId, type)
                .isPresent();
    }

    public void ensureUserHasRequiredDocuments(Long userId) {
        if (!hasUserDocument(userId, KycDocumentType.PROFILE_PHOTO)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Missing required KYC document: PROFILE_PHOTO");
        }
        if (!hasUserDocument(userId, KycDocumentType.PAN_CARD)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Missing required KYC document: PAN_CARD");
        }

        boolean hasLegacyAadhaar = hasUserDocument(userId, KycDocumentType.AADHAAR_CARD);
        boolean hasAadhaarFrontAndBack = hasUserDocument(userId, KycDocumentType.AADHAAR_FRONT)
                && hasUserDocument(userId, KycDocumentType.AADHAAR_BACK);
        if (!hasLegacyAadhaar && !hasAadhaarFrontAndBack) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Missing required KYC document: AADHAAR_CARD");
        }
    }

    private boolean hasUserDocument(Long userId, KycDocumentType type) {
        return documentRepository
                .findTopByUserIdAndDocumentTypeOrderByUploadedAtDesc(userId, type)
                .isPresent();
    }

    private UserKycDocument storeDocument(
            Long userId,
            UUID tempRegistrationId,
            String ownerSegment,
            KycDocumentType documentType,
            MultipartFile file
    ) throws IOException {
        if (file == null || file.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "File is empty");
        }
        String originalName = file.getOriginalFilename() != null ? file.getOriginalFilename() : documentType.name().toLowerCase();
        String safeName = objectStorageService.sanitizeFileName(originalName);
        FileUploadSecurityValidator.ValidatedUpload validated = fileUploadSecurityValidator.validateProjectDocument(file, safeName);
        validateKycContentType(documentType, validated.contentType());
        String objectKey = objectStorageService.storeKycDocument(
                file,
                ownerSegment,
                documentType.name(),
                safeName,
                validated.contentType()
        );
        return documentRepository.save(UserKycDocument.builder()
                .userId(userId)
                .tempRegistrationId(tempRegistrationId)
                .documentType(documentType)
                .objectKey(objectKey)
                .contentType(validated.contentType())
                .originalFileName(safeName)
                .fileSize(file.getSize())
                .verificationStatus(KycVerificationStatus.PENDING)
                .build());
    }

    private void validateKycContentType(KycDocumentType documentType, String contentType) {
        boolean image = contentType != null && contentType.startsWith("image/");
        boolean pdf = "application/pdf".equals(contentType);
        if (documentType == KycDocumentType.PROFILE_PHOTO && !image) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Profile photo must be an image");
        }
        if (documentType != KycDocumentType.PROFILE_PHOTO && !image && !pdf) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "KYC document must be an image or PDF");
        }
    }

    private boolean canReadDocument(User current, UserKycDocument document) {
        if (current.getRole() == Role.SUPER_ADMIN) {
            return true;
        }
        if (document.getUserId() == null) {
            return false;
        }
        User owner = userRepository.findById(document.getUserId()).orElse(null);
        if (owner == null) {
            return false;
        }
        if (current.getRole() == Role.ADMIN && canManageUserDocuments(current, owner)) {
            return true;
        }
        return current.getId().equals(owner.getId())
                && document.getDocumentType() == KycDocumentType.PROFILE_PHOTO;
    }

    private boolean canManageUserDocuments(User current, User target) {
        if (current.getRole() == Role.SUPER_ADMIN) {
            return true;
        }
        return current.getRole() == Role.ADMIN
                && (current.getId().equals(target.getId()) || current.getId().equals(target.getAddedBy()));
    }

    private User currentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || "anonymousUser".equals(auth.getPrincipal())) {
            return null;
        }
        return userRepository.findByEmail(auth.getName()).orElse(null);
    }

    private UUID parseUuid(String token) {
        try {
            return UUID.fromString(token);
        } catch (IllegalArgumentException ex) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid registration token");
        }
    }

    private KycDocumentResponse toResponse(UserKycDocument document) {
        return KycDocumentResponse.builder()
                .id(document.getId())
                .userId(document.getUserId())
                .tempRegistrationId(document.getTempRegistrationId())
                .documentType(document.getDocumentType())
                .contentType(document.getContentType())
                .originalFileName(document.getOriginalFileName())
                .fileSize(document.getFileSize())
                .verificationStatus(document.getVerificationStatus())
                .uploadedAt(document.getUploadedAt())
                .build();
    }
}
