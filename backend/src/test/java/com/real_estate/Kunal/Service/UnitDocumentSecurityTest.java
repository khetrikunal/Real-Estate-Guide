package com.real_estate.Kunal.Service;

import com.real_estate.Kunal.Entity.*;
import com.real_estate.Kunal.Repository.*;
import com.real_estate.Kunal.Security.*;
import org.junit.jupiter.api.Test;
import java.net.URI;
import java.util.*;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

class UnitDocumentSecurityTest {
    private final ProjectRepository projects = mock(ProjectRepository.class);
    private final PropertyUnitRepository units = mock(PropertyUnitRepository.class);
    private final UnitDocumentRepository documents = mock(UnitDocumentRepository.class);
    private final ObjectStorageService storage = mock(ObjectStorageService.class);
    private final SignedMediaUrlService signer = new SignedMediaUrlService("unit-test-signing-secret", 300);
    private final PropertyManagementService service = new PropertyManagementService(projects, mock(BuildingRepository.class),
            mock(FloorRepository.class), units, documents, mock(UserRepository.class), storage,
            mock(FileUploadSecurityValidator.class), signer, mock(ProjectService.class));
    private final String path = "/api/properties/1/units/2/documents/3/download";

    @Test
    void validSignedLinkLoadsOnlyItsBoundDocument() throws Exception {
        var query = org.springframework.web.util.UriComponentsBuilder.fromUriString(signer.signPath(path)).build().getQueryParams();
        long exp = Long.parseLong(query.getFirst("exp"));
        String sig = query.getFirst("sig");
        when(projects.findById(1L)).thenReturn(Optional.of(Project.builder().id(1L).build()));
        when(units.findByIdAndPropertyProjectId(2L, 1L)).thenReturn(Optional.of(PropertyUnit.builder().id(2L).build()));
        when(documents.findByIdAndUnitId(3L, 2L)).thenReturn(Optional.of(UnitDocument.builder().filePath("private/doc.pdf").build()));
        var stored = new ObjectStorageService.StoredObject(new byte[]{1, 2}, "application/pdf", 2);
        when(storage.loadProjectDocument("private/doc.pdf")).thenReturn(stored);
        assertThat(service.downloadSignedUnitDocument(1L, 2L, 3L, exp, sig)).isSameAs(stored);
        assertThatThrownBy(() -> service.downloadSignedUnitDocument(1L, 2L, 4L, exp, sig))
                .isInstanceOf(org.springframework.web.server.ResponseStatusException.class);
        verify(documents, never()).findByIdAndUnitId(4L, 2L);
    }

    @Test
    void expiredOrMissingSignatureNeverReadsStorage() {
        assertThatThrownBy(() -> service.downloadSignedUnitDocument(1L, 2L, 3L, null, null))
                .isInstanceOf(org.springframework.web.server.ResponseStatusException.class);
        assertThatThrownBy(() -> service.downloadSignedUnitDocument(1L, 2L, 3L, 1L, "expired"))
                .isInstanceOf(org.springframework.web.server.ResponseStatusException.class);
        verifyNoInteractions(projects, units, documents, storage);
    }
}
