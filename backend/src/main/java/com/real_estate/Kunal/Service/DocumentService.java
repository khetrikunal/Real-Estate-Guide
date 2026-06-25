package com.real_estate.Kunal.Service;

import com.real_estate.Kunal.DTO.ProjectDocumentResponse;
import com.real_estate.Kunal.Entity.ProjectDocument;
import com.real_estate.Kunal.Entity.Project;
import com.real_estate.Kunal.Entity.ProjectConfig;
import com.real_estate.Kunal.Repository.ProjectConfigRepository;
import com.real_estate.Kunal.Repository.ProjectDocumentRepository;
import com.real_estate.Kunal.Security.FileUploadSecurityValidator;

import lombok.RequiredArgsConstructor;

import org.springframework.core.io.ByteArrayResource;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

@Service
@RequiredArgsConstructor
public class DocumentService {

    private final ProjectDocumentRepository documentRepository;
    private final ProjectService projectService;
    private final ProjectConfigRepository configRepository;
    private final ObjectStorageService objectStorageService;
    private final FileUploadSecurityValidator fileUploadSecurityValidator;

    private static final int MAX_FILES_PER_UPLOAD = 20;

    public List<ProjectDocument> uploadDocuments(Long projectId,
                                                  MultipartFile[] files,
                                                  Long uploadedBy) throws IOException {
        Project project = projectService.findProjectEntity(projectId);
        projectService.ensureCanModifyProject(project);

        if (files.length > MAX_FILES_PER_UPLOAD) {
            throw new RuntimeException(
                    "Maximum " + MAX_FILES_PER_UPLOAD + " files allowed per upload");
        }

        List<ProjectDocument> savedDocs = new ArrayList<>();

        for (MultipartFile file : files) {
            String originalName = file.getOriginalFilename();
            if (originalName == null || originalName.isEmpty()) {
                throw new RuntimeException("File name is missing");
            }

            String safeFileName = objectStorageService.sanitizeFileName(originalName);
            FileUploadSecurityValidator.ValidatedUpload validatedUpload =
                    fileUploadSecurityValidator.validateProjectDocument(file, safeFileName);

            String storedPath = objectStorageService.storeProjectDocument(
                    file,
                    projectId,
                    null,
                    safeFileName,
                    validatedUpload.contentType()
            );

            ProjectDocument doc = ProjectDocument.builder()
                    .fileName(safeFileName)
                    .fileType(validatedUpload.contentType())
                    .filePath(storedPath)
                    .projectId(projectId)
                    .uploadedBy(uploadedBy)
                    .fileSize(file.getSize())
                    .uploadedAt(LocalDateTime.now())
                    .build();

            savedDocs.add(documentRepository.save(doc));
        }

        return savedDocs;
    }

    public List<ProjectDocument> getProjectDocuments(Long projectId) {
        return documentRepository.findByProjectId(projectId);
    }

    public ProjectDocument getDocumentById(Long documentId) {
        return documentRepository.findById(documentId)
                .orElseThrow(() -> new RuntimeException("Document not found"));
    }

    public ProjectDocument getAccessibleDocumentById(Long documentId) {
        ProjectDocument document = getDocumentById(documentId);
        Project project = projectService.findProjectEntity(document.getProjectId());
        projectService.ensureProjectVisible(project);
        return document;
    }

    public Resource loadDocumentAsResource(Long documentId) throws IOException {

        ProjectDocument doc = getAccessibleDocumentById(documentId);
        ObjectStorageService.StoredObject storedObject = objectStorageService.loadProjectDocument(doc.getFilePath());
        return new ByteArrayResource(storedObject.bytes());
    }

    public void deleteDocument(Long documentId) {

        ProjectDocument doc = getDocumentById(documentId);
        Project project = projectService.findProjectEntity(doc.getProjectId());
        projectService.ensureCanModifyProject(project);

        objectStorageService.deleteProjectDocument(doc.getFilePath());

        // Delete DB record
        documentRepository.delete(doc);
    }

    public List<ProjectDocument> getDocumentsByUploader(Long uploadedBy) {
        return documentRepository.findByUploadedBy(uploadedBy)
                .stream()
                .filter(this::isAccessibleToCurrentUser)
                .toList();
    }

    // ── Config-level document operations ──────────────────────

    public List<ProjectDocument> uploadConfigDocuments(Long configId,
                                                       MultipartFile[] files,
                                                       Long uploadedBy) throws IOException {
        ProjectConfig config = configRepository.findById(configId)
                .orElseThrow(() -> new RuntimeException("Config not found: " + configId));
        Project project = config.getProject();
        projectService.ensureCanModifyProject(project);
        Long projectId = project.getId();

        if (files.length > MAX_FILES_PER_UPLOAD) {
            throw new RuntimeException(
                    "Maximum " + MAX_FILES_PER_UPLOAD + " files allowed per upload");
        }

        List<ProjectDocument> savedDocs = new ArrayList<>();

        for (MultipartFile file : files) {
            String originalName = file.getOriginalFilename();
            if (originalName == null || originalName.isEmpty()) {
                throw new RuntimeException("File name is missing");
            }

            String safeFileName = objectStorageService.sanitizeFileName(originalName);
            FileUploadSecurityValidator.ValidatedUpload validatedUpload =
                    fileUploadSecurityValidator.validateProjectDocument(file, safeFileName);

            String storedPath = objectStorageService.storeProjectDocument(
                    file,
                    projectId,
                    configId,
                    safeFileName,
                    validatedUpload.contentType()
            );

            ProjectDocument doc = ProjectDocument.builder()
                    .fileName(safeFileName)
                    .fileType(validatedUpload.contentType())
                    .filePath(storedPath)
                    .projectId(projectId)
                    .configId(configId)
                    .uploadedBy(uploadedBy)
                    .fileSize(file.getSize())
                    .uploadedAt(LocalDateTime.now())
                    .build();

            savedDocs.add(documentRepository.save(doc));
        }

        return savedDocs;
    }

    public List<ProjectDocument> getConfigDocuments(Long configId) {
        ProjectConfig config = configRepository.findById(configId)
                .orElseThrow(() -> new RuntimeException("Config not found: " + configId));
        projectService.ensureProjectVisible(config.getProject());
        return documentRepository.findByConfigId(configId);
    }

    public void deleteConfigDocument(Long configId, Long documentId) {
        ProjectConfig config = configRepository.findById(configId)
                .orElseThrow(() -> new RuntimeException("Config not found: " + configId));
        projectService.ensureCanModifyProject(config.getProject());
        ProjectDocument doc = getDocumentById(documentId);
        if (doc.getConfigId() == null || !doc.getConfigId().equals(configId)) {
            throw new RuntimeException("Document " + documentId + " does not belong to config " + configId);
        }

        objectStorageService.deleteProjectDocument(doc.getFilePath());

        documentRepository.delete(doc);
    }

    // ── Cover Photo Upload ──────────────────────

    @Transactional
    public ProjectDocumentResponse uploadCoverPhoto(Long projectId, MultipartFile file, Long uploadedBy) throws IOException {
        Project project = projectService.findProjectEntity(projectId);
        projectService.ensureCanModifyProject(project);

        String originalName = file.getOriginalFilename();
        if (originalName == null || originalName.isEmpty()) {
            throw new RuntimeException("File name is missing");
        }

        String safeFileName = objectStorageService.sanitizeFileName(originalName);
        FileUploadSecurityValidator.ValidatedUpload validatedUpload =
                fileUploadSecurityValidator.validateProjectImage(file, safeFileName);
        String storedFileName = "cover_" + imageFileNameForContentType(safeFileName, validatedUpload.contentType());

        // Store in S3 with cover-specific path
        String storedPath = objectStorageService.storeProjectCoverPhoto(
                file,
                projectId,
                storedFileName,
                validatedUpload.contentType()
        );

        // Save document record
        ProjectDocument doc = ProjectDocument.builder()
                .fileName(safeFileName)
                .fileType(validatedUpload.contentType())
                .filePath(storedPath)
                .projectId(projectId)
                .uploadedBy(uploadedBy)
                .fileSize(file.getSize())
                .uploadedAt(LocalDateTime.now())
                .build();

        ProjectDocument savedDoc = documentRepository.save(doc);

        projectService.updateCoverPhotoUrl(projectId, "/api/documents/download/" + savedDoc.getId());
        return projectService.toProjectDocumentResponse(savedDoc);
    }

    private String imageFileNameForContentType(String safeFileName, String contentType) {
        String baseName = safeFileName;
        int dotIndex = baseName.lastIndexOf('.');
        if (dotIndex > 0) {
            baseName = baseName.substring(0, dotIndex);
        }
        String extension = switch (contentType.toLowerCase(Locale.ROOT)) {
            case "image/jpeg" -> ".jpg";
            case "image/png" -> ".png";
            case "image/webp" -> ".webp";
            default -> "";
        };
        return baseName + extension;
    }

    private boolean isAccessibleToCurrentUser(ProjectDocument document) {
        try {
            Project project = projectService.findProjectEntity(document.getProjectId());
            projectService.ensureProjectVisible(project);
            return true;
        } catch (RuntimeException ex) {
            return false;
        }
    }
}
