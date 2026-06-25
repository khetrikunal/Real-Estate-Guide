package com.real_estate.Kunal.Controller;

import com.real_estate.Kunal.DTO.KycDocumentResponse;
import com.real_estate.Kunal.Entity.KycDocumentType;
import com.real_estate.Kunal.Entity.UserKycDocument;
import com.real_estate.Kunal.Service.KycDocumentService;
import com.real_estate.Kunal.Service.ObjectStorageService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.CacheControl;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;

@RestController
@RequestMapping("/api/kyc")
@RequiredArgsConstructor
public class KycDocumentController {

    private final KycDocumentService kycDocumentService;

    @PostMapping("/uploads/temp/{token}")
    public KycDocumentResponse uploadForTemp(
            @PathVariable String token,
            @RequestParam("documentType") KycDocumentType documentType,
            @RequestParam("file") MultipartFile file
    ) throws IOException {
        return kycDocumentService.uploadForTemp(token, documentType, file);
    }

    @PostMapping("/uploads/users/{userId}")
    public KycDocumentResponse uploadForUser(
            @PathVariable Long userId,
            @RequestParam("documentType") KycDocumentType documentType,
            @RequestParam("file") MultipartFile file
    ) throws IOException {
        return kycDocumentService.uploadForUser(userId, documentType, file);
    }

    @GetMapping("/documents/{documentId}")
    public ResponseEntity<byte[]> getDocument(@PathVariable Long documentId) throws IOException {
        UserKycDocument metadata = kycDocumentService.getDocument(documentId);
        ObjectStorageService.StoredObject storedObject = kycDocumentService.loadAuthorizedDocument(documentId);
        String contentType = storedObject.contentType() != null
                ? storedObject.contentType()
                : MediaType.APPLICATION_OCTET_STREAM_VALUE;
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(contentType))
                .contentLength(storedObject.contentLength())
                .cacheControl(CacheControl.noStore())
                .header(HttpHeaders.CONTENT_DISPOSITION, ContentDisposition.inline()
                        .filename(metadata.getOriginalFileName() != null ? metadata.getOriginalFileName() : "kyc-document")
                        .build()
                        .toString())
                .body(storedObject.bytes());
    }
}
