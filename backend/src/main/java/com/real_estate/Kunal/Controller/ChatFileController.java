package com.real_estate.Kunal.Controller;

import com.real_estate.Kunal.Entity.User;
import com.real_estate.Kunal.Security.FileUploadSecurityValidator;
import com.real_estate.Kunal.Security.SignedMediaUrlService;
import com.real_estate.Kunal.Service.ChatService;
import com.real_estate.Kunal.Service.ObjectStorageService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.nio.file.Path;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/chat")
@Slf4j
@RequiredArgsConstructor
public class ChatFileController {

    private final ObjectStorageService objectStorageService;
    private final ChatService chatService;
    private final FileUploadSecurityValidator fileUploadSecurityValidator;
    private final SignedMediaUrlService signedMediaUrlService;

    @PostMapping("/upload")
    public ResponseEntity<Map<String, Object>> uploadFile(
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "conversationId", required = false) String conversationId,
            java.security.Principal principal) {

        if (file.isEmpty()) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", "File is empty"));
        }

        try {
            User currentUser = chatService.getUserByEmail(principal.getName());
            if (conversationId != null && !conversationId.isBlank()) {
                chatService.ensureConversationParticipant(UUID.fromString(conversationId), currentUser.getId());
            }

            String originalName = file.getOriginalFilename() != null
                    ? file.getOriginalFilename() : "file";
            String safeOriginalName = objectStorageService.sanitizeFileName(originalName);
            FileUploadSecurityValidator.ValidatedUpload validatedUpload =
                    fileUploadSecurityValidator.validateChatAttachment(file, safeOriginalName);
            String extension = "";
            int dotIndex = safeOriginalName.lastIndexOf('.');
            if (dotIndex > 0) {
                extension = safeOriginalName.substring(dotIndex);
            }
            String storedName = UUID.randomUUID() + extension;
            String storedPath = objectStorageService.storeChatAttachment(
                    file,
                    conversationId,
                    storedName,
                    validatedUpload.contentType()
            );

            String fileUrl = objectStorageService.getPublicUrl(storedPath);
            String contentType = validatedUpload.contentType();
            String messageType = contentType.startsWith("image/")
                    ? "image"
                    : contentType.startsWith("video/") ? "video" : "file";

            return ResponseEntity.ok(Map.of(
                    "fileUrl", fileUrl,
                    "content", fileUrl,
                    "fileName", safeOriginalName,
                    "fileSize", file.getSize(),
                    "mimeType", contentType,
                    "fileMimeType", contentType,
                    "type", messageType
            ));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", e.getMessage()));
        } catch (IOException e) {
            log.error("Chat file upload failed", e);
            return ResponseEntity.internalServerError()
                    .body(Map.of("error", "Upload failed: " + e.getMessage()));
        }
    }

    @GetMapping("/files/{filename}")
    public ResponseEntity<?> serveFile(@PathVariable String filename,
                                       @RequestParam(value = "exp", required = false) Long exp,
                                       @RequestParam(value = "sig", required = false) String sig,
                                       java.security.Principal principal) {
        try {
            String safeFilename = Path.of(filename).getFileName().toString();
            String canonicalPath = "/api/chat/files/" + safeFilename;
            if (principal != null) {
                User currentUser = chatService.getUserByEmail(principal.getName());
                chatService.ensureAttachmentAccessible(canonicalPath, currentUser.getId());
            } else if (!signedMediaUrlService.isValid(canonicalPath, exp, sig)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
            }
            ObjectStorageService.StoredObject storedObject = objectStorageService.loadChatAttachment(safeFilename);

            String contentType = storedObject.contentType();
            if (contentType == null || contentType.isBlank()) {
                contentType = "application/octet-stream";
            }

            Resource resource = new ByteArrayResource(storedObject.bytes());
            String disposition = fileUploadSecurityValidator.isInlineSafe(contentType) ? "inline" : "attachment";

            return ResponseEntity.ok()
                    .contentType(MediaType.parseMediaType(contentType))
                    .contentLength(storedObject.contentLength())
                    .header(HttpHeaders.ACCEPT_RANGES, "bytes")
                    .header(HttpHeaders.CONTENT_DISPOSITION, disposition + "; filename=\"" + safeFilename + "\"")
                    .body(resource);
        } catch (IOException e) {
            return ResponseEntity.notFound().build();
        } catch (ResponseStatusException e) {
            return ResponseEntity.status(e.getStatusCode()).body(Map.of(
                    "error", e.getReason() != null ? e.getReason() : "Attachment access denied"
            ));
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }

}
