package com.real_estate.Kunal.Controller;

import com.real_estate.Kunal.DTO.ProjectDocumentResponse;
import com.real_estate.Kunal.Entity.ProjectDocument;
import com.real_estate.Kunal.Security.SignedMediaUrlService;
import com.real_estate.Kunal.Service.DocumentService;
import com.real_estate.Kunal.Service.ProjectService;
import lombok.extern.slf4j.Slf4j;

import lombok.RequiredArgsConstructor;

import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.security.Principal;
import java.util.List;

@RestController
@RequestMapping("/api/documents")
@RequiredArgsConstructor
@Slf4j
public class DocumentController {

    private final DocumentService documentService;
    private final ProjectService projectService;
    private final SignedMediaUrlService signedMediaUrlService;

    @PostMapping("/upload/{projectId}")
    public List<ProjectDocumentResponse> uploadDocuments(
            @PathVariable("projectId") Long projectId,
            @RequestParam("files") MultipartFile[] files,
            @RequestParam(value = "uploadedBy", required = false) Long uploadedBy
    ) throws IOException {

        documentService.uploadDocuments(projectId, files, uploadedBy);
        return projectService.getProjectDocumentResponses(projectId);
    }

    @GetMapping("/{projectId}")
    public List<ProjectDocumentResponse> getDocuments(@PathVariable("projectId") Long projectId) {
        return projectService.getProjectDocumentResponses(projectId);
    }

    @GetMapping("/download/{documentId}")
    public ResponseEntity<Resource> downloadDocument(
            @PathVariable("documentId") String documentId,
            @RequestParam(value = "exp", required = false) Long exp,
            @RequestParam(value = "sig", required = false) String sig,
            Principal principal) throws IOException {

        final Long cleanDocumentId = sanitizeDocumentId(documentId);
        if (cleanDocumentId == null) {
            log.warn("Invalid document id received for download: '{}'", documentId);
            return ResponseEntity.badRequest().build();
        }

        log.info("Document download request reached controller for documentId='{}' (sanitized={})", documentId, cleanDocumentId);

        String canonicalPath = "/api/documents/download/" + cleanDocumentId;
        ProjectDocument doc;
        if (principal != null) {
            doc = documentService.getAccessibleDocumentById(cleanDocumentId);
        } else if (signedMediaUrlService.isValid(canonicalPath, exp, sig)) {
            doc = documentService.getDocumentById(cleanDocumentId);
        } else {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        Resource resource = documentService.loadDocumentAsResource(cleanDocumentId);

        String contentType = doc.getFileType();
        if (contentType == null || contentType.isEmpty()) {
            contentType = "application/octet-stream";
        }

        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(contentType))
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=\"" + doc.getFileName() + "\"")
                .body(resource);
    }

    private Long sanitizeDocumentId(String rawId) {
        if (rawId == null || rawId.isBlank()) {
            return null;
        }
        final String cleaned = rawId.contains(":")
                ? rawId.substring(0, rawId.indexOf(':')).trim()
                : rawId.trim();
        try {
            return Long.parseLong(cleaned);
        } catch (NumberFormatException ex) {
            return null;
        }
    }

    @DeleteMapping("/{documentId}")
    public ResponseEntity<String> deleteDocument(@PathVariable("documentId") Long documentId) {
        documentService.deleteDocument(documentId);
        return ResponseEntity.ok("Document deleted successfully");
    }

    @GetMapping("/uploader/{uploadedBy}")
    public List<ProjectDocumentResponse> getDocumentsByUploader(
            @PathVariable("uploadedBy") Long uploadedBy) {
        return documentService.getDocumentsByUploader(uploadedBy)
                .stream()
                .map(projectService::toProjectDocumentResponse)
                .toList();
    }

    // ── Config-level document endpoints ──────────────────────

    @PostMapping("/upload/config/{configId}")
    public List<ProjectDocumentResponse> uploadConfigDocuments(
            @PathVariable("configId") Long configId,
            @RequestParam("files") MultipartFile[] files,
            @RequestParam(value = "uploadedBy", required = false) Long uploadedBy
    ) throws IOException {
        documentService.uploadConfigDocuments(configId, files, uploadedBy);
        return documentService.getConfigDocuments(configId)
                .stream()
                .map(projectService::toProjectDocumentResponse)
                .toList();
    }

    @GetMapping("/config/{configId}")
    public List<ProjectDocumentResponse> getConfigDocuments(
            @PathVariable("configId") Long configId) {
        return documentService.getConfigDocuments(configId)
                .stream()
                .map(projectService::toProjectDocumentResponse)
                .toList();
    }

    @DeleteMapping("/config/{configId}/{documentId}")
    public ResponseEntity<String> deleteConfigDocument(
            @PathVariable("configId") Long configId,
            @PathVariable("documentId") Long documentId) {
        documentService.deleteConfigDocument(configId, documentId);
        return ResponseEntity.ok("Config document deleted successfully");
    }

    // ── Cover Photo Upload ──────────────────────

    @PostMapping("/upload/cover/{projectId}")
    public ResponseEntity<ProjectDocumentResponse> uploadCoverPhoto(
            @PathVariable("projectId") Long projectId,
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "uploadedBy", required = false) Long uploadedBy
    ) throws IOException {
        ProjectDocumentResponse response = documentService.uploadCoverPhoto(projectId, file, uploadedBy);
        return ResponseEntity.ok(response);
    }
}
