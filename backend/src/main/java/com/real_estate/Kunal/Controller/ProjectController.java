package com.real_estate.Kunal.Controller;

import com.real_estate.Kunal.DTO.ProjectDocumentResponse;
import com.real_estate.Kunal.DTO.ProjectRequest;
import com.real_estate.Kunal.DTO.ProjectResponse;
import com.real_estate.Kunal.DTO.SellProjectRequest;
import com.real_estate.Kunal.Security.FileUploadSecurityValidator;
import com.real_estate.Kunal.Service.ObjectStorageService;
import com.real_estate.Kunal.Service.ProjectService;

import jakarta.validation.Valid;

import lombok.RequiredArgsConstructor;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.Locale;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/projects")
@RequiredArgsConstructor
public class ProjectController {

    private final ProjectService projectService;
    private final ObjectStorageService objectStorageService;
    private final FileUploadSecurityValidator fileUploadSecurityValidator;


    @PostMapping("/create")
    public ProjectResponse createProject(@Valid @RequestBody ProjectRequest request){
        return projectService.createProject(request);
    }

    @GetMapping
    public List<ProjectResponse> getAllProjects(){
        return projectService.getAllProjects();
    }

    @GetMapping("/{id}")
    public ProjectResponse getProjectById(@PathVariable("id") Long id){
        return projectService.getProjectById(id);
    }

    @GetMapping("/{id}/documents")
    public List<ProjectDocumentResponse> getProjectDocuments(@PathVariable("id") Long id) {
        return projectService.getProjectDocumentResponses(id);
    }

    @PutMapping("/{id}")
    public ProjectResponse updateProject(@PathVariable("id") Long id,
                                         @Valid @RequestBody ProjectRequest request){
        return projectService.updateProject(id,request);
    }

    @PatchMapping("/{id}")
    public ProjectResponse patchProject(@PathVariable("id") Long id,
                                       @Valid @RequestBody ProjectRequest request){
        return projectService.updateProject(id,request);
    }

    @PostMapping("/{id}/sell")
    public ProjectResponse sellProject(
            @PathVariable("id") Long id,
            @Valid @RequestBody SellProjectRequest request
    ) {
        return projectService.recordSale(id, request);
    }

    @GetMapping("/trash")
    public List<ProjectResponse> getTrashProjects() {
        return projectService.getTrashProjects();
    }

    @PutMapping("/{id}/trash")
    public ProjectResponse moveToTrashPut(@PathVariable("id") Long id) {
        return projectService.moveToTrash(id);
    }

    @PostMapping("/{id}/trash")
    public ProjectResponse moveToTrashPost(@PathVariable("id") Long id) {
        return projectService.moveToTrash(id);
    }

    @PutMapping("/{id}/restore")
    public ProjectResponse restoreProjectPut(@PathVariable("id") Long id) {
        return projectService.restoreProject(id);
    }

    @PostMapping("/{id}/restore")
    public ProjectResponse restoreProjectPost(@PathVariable("id") Long id) {
        return projectService.restoreProject(id);
    }

    @DeleteMapping("/{id}/permanent")
    public ResponseEntity<?> deleteProjectPermanently(@PathVariable("id") Long id) {
        projectService.deleteProjectPermanently(id);
        return ResponseEntity.ok(Map.of("success", true, "message", "Project permanently deleted successfully"));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteProject(
            @PathVariable("id") Long id,
            @RequestParam(name = "permanent", defaultValue = "false") boolean permanent
    ) {
        if (permanent) {
            projectService.deleteProjectPermanently(id);
            return ResponseEntity.ok(Map.of("success", true, "message", "Project permanently deleted successfully"));
        } else {
            ProjectResponse res = projectService.moveToTrash(id);
            return ResponseEntity.ok(Map.of("success", true, "message", "Project moved to Trash successfully", "project", res));
        }
    }

    @GetMapping("/search")
    public List<ProjectResponse> searchProjects(
            @RequestParam(required = false) String propertyType,
            @RequestParam(required = false) String listingType,
            @RequestParam(required = false) Double minPrice,
            @RequestParam(required = false) Double maxPrice,
            @RequestParam(required = false) List<String> completionBuckets
    ) {
        return projectService.searchProjects(
                propertyType,
                listingType,
                minPrice,
                maxPrice,
                completionBuckets
        );
    }

    @GetMapping("/broker/{brokerId}")
    public List<ProjectResponse> getBrokerProjects(@PathVariable("brokerId") Long brokerId) {
        return projectService.getBrokerAccessibleProjects(brokerId);
    }

    @GetMapping("/employee/{employeeId}")
    public List<ProjectResponse> getEmployeeProjects(@PathVariable("employeeId") Long employeeId) {
        return projectService.getEmployeeProjects(employeeId);
    }

    @GetMapping("/uploader/{uploaderId}")
    public List<ProjectResponse> getProjectsByUploader(@PathVariable("uploaderId") Long uploaderId) {
        return projectService.getProjectsByUploader(uploaderId);
    }

    @GetMapping("/city/{city}")
    public List<ProjectResponse> getProjectsByCity(
            @PathVariable("city") String city,
            @RequestParam(value = "area", required = false) String area) {
        return projectService.getProjectsByCity(city, area);
    }

    /**
     * Upload cover photo for a project
     * Saves to S3 and stores the URL in project's coverPhotoUrl field
     */
    @PostMapping("/{id}/cover-photo")
    public ResponseEntity<?> uploadCoverPhoto(
            @PathVariable("id") Long id,
            @RequestParam("file") MultipartFile file) {

        if (file.isEmpty()) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", "File is empty"));
        }

        try {
            // Generate safe filename
            String originalName = file.getOriginalFilename() != null
                    ? file.getOriginalFilename()
                    : "cover.jpg";
            String safeName = objectStorageService.sanitizeFileName(originalName);
            FileUploadSecurityValidator.ValidatedUpload validatedUpload =
                    fileUploadSecurityValidator.validateProjectImage(file, safeName);
            String normalizedContentType = validatedUpload.contentType();
            String storedFileName = "cover_" + imageFileNameForContentType(safeName, normalizedContentType);

            String storedPath = objectStorageService.storeProjectCoverPhoto(
                    file,
                    id,
                    storedFileName,
                    normalizedContentType
            );

            String fileUrl = objectStorageService.getPublicUrl(storedPath);

            projectService.updateCoverPhotoUrl(id, fileUrl);

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "coverPhotoUrl", fileUrl,
                    "message", "Cover photo uploaded successfully"
            ));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", e.getMessage()));
        } catch (IOException e) {
            return ResponseEntity.internalServerError()
                    .body(Map.of("error", "Upload failed: " + e.getMessage()));
        }
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
        return baseName + "_" + System.currentTimeMillis() + extension;
    }

}
