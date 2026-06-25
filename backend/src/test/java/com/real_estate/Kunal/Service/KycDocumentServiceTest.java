package com.real_estate.Kunal.Service;

import com.real_estate.Kunal.Entity.KycDocumentType;
import com.real_estate.Kunal.Entity.UserKycDocument;
import com.real_estate.Kunal.Repository.TempRegistrationRepository;
import com.real_estate.Kunal.Repository.UserKycDocumentRepository;
import com.real_estate.Kunal.Repository.UserRepository;
import com.real_estate.Kunal.Security.FileUploadSecurityValidator;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class KycDocumentServiceTest {

    @Test
    void tempRegistrationAcceptsPanPlusAadhaarFrontAndBack() {
        UUID tempId = UUID.randomUUID();
        UserKycDocumentRepository documentRepository = mock(UserKycDocumentRepository.class);
        when(documentRepository.findTopByTempRegistrationIdAndDocumentTypeOrderByUploadedAtDesc(tempId, KycDocumentType.PROFILE_PHOTO))
                .thenReturn(Optional.of(UserKycDocument.builder().build()));
        when(documentRepository.findTopByTempRegistrationIdAndDocumentTypeOrderByUploadedAtDesc(tempId, KycDocumentType.PAN_CARD))
                .thenReturn(Optional.of(UserKycDocument.builder().build()));
        when(documentRepository.findTopByTempRegistrationIdAndDocumentTypeOrderByUploadedAtDesc(tempId, KycDocumentType.AADHAAR_FRONT))
                .thenReturn(Optional.of(UserKycDocument.builder().build()));
        when(documentRepository.findTopByTempRegistrationIdAndDocumentTypeOrderByUploadedAtDesc(tempId, KycDocumentType.AADHAAR_BACK))
                .thenReturn(Optional.of(UserKycDocument.builder().build()));

        KycDocumentService service = new KycDocumentService(
                mock(ObjectStorageService.class),
                mock(FileUploadSecurityValidator.class),
                documentRepository,
                mock(TempRegistrationRepository.class),
                mock(UserRepository.class)
        );

        assertThatCode(() -> service.ensureTempHasRequiredDocuments(tempId))
                .doesNotThrowAnyException();
    }

    @Test
    void tempRegistrationRejectsMissingAadhaarCard() {
        UUID tempId = UUID.randomUUID();
        UserKycDocumentRepository documentRepository = mock(UserKycDocumentRepository.class);
        when(documentRepository.findTopByTempRegistrationIdAndDocumentTypeOrderByUploadedAtDesc(tempId, KycDocumentType.PAN_CARD))
                .thenReturn(Optional.of(UserKycDocument.builder().build()));

        KycDocumentService service = new KycDocumentService(
                mock(ObjectStorageService.class),
                mock(FileUploadSecurityValidator.class),
                documentRepository,
                mock(TempRegistrationRepository.class),
                mock(UserRepository.class)
        );

        assertThatThrownBy(() -> service.ensureTempHasRequiredDocuments(tempId))
                .isInstanceOf(ResponseStatusException.class)
                .extracting("statusCode")
                .isEqualTo(HttpStatus.BAD_REQUEST);
    }
}
