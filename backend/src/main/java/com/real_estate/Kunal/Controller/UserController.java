package com.real_estate.Kunal.Controller;

import com.real_estate.Kunal.DTO.UpdateProfileRequest;
import com.real_estate.Kunal.Entity.Role;
import com.real_estate.Kunal.Entity.User;
import com.real_estate.Kunal.Repository.UserRepository;
import com.real_estate.Kunal.Security.FileUploadSecurityValidator;
import com.real_estate.Kunal.Service.ObjectStorageService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.security.core.Authentication;

import java.io.IOException;
import java.time.LocalDateTime;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final UserRepository userRepository;
    private final ObjectStorageService objectStorageService;
    private final FileUploadSecurityValidator fileUploadSecurityValidator;

    @GetMapping("/{id}")
    public UserProfileResponse getUserById(@PathVariable Long id, Authentication authentication) {
        User actor = authenticatedUser(authentication);
        User target = userRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
        assertProfileAccess(actor, target);
        return UserProfileResponse.from(target);
    }

    @PatchMapping("/{id}")
    public UserProfileResponse updateProfile(@PathVariable Long id,
                                             @RequestBody UpdateProfileRequest request,
                                             Authentication authentication) {
        User actor = authenticatedUser(authentication);
        User target = userRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));

        assertProfileAccess(actor, target);

        if (request.getName() != null && !request.getName().trim().isEmpty()) {
            target.setName(request.getName().trim());
        }
        if (request.getPhone() != null) {
            target.setPhone(request.getPhone().trim());
        }
        if (request.getProfilePhotoUrl() != null) {
            target.setProfilePhotoUrl(request.getProfilePhotoUrl().trim());
        }

        return UserProfileResponse.from(userRepository.save(target));
    }

    @PostMapping(value = "/{id}/profile-photo", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<Map<String, String>> uploadProfilePhoto(
            @PathVariable Long id,
            @RequestParam("file") MultipartFile file,
            Authentication authentication) {
        User actor = authenticatedUser(authentication);
        User target = userRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
        assertProfileAccess(actor, target);

        if (file.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "File is empty"));
        }

        try {
            String originalName = file.getOriginalFilename() != null ? file.getOriginalFilename() : "photo.jpg";
            String safeName = objectStorageService.sanitizeFileName(originalName);
            FileUploadSecurityValidator.ValidatedUpload validated =
                    fileUploadSecurityValidator.validateProjectImage(file, safeName);

            String ext = safeName.contains(".") ? safeName.substring(safeName.lastIndexOf('.')) : ".jpg";
            String storedName = "photo_" + UUID.randomUUID() + ext;
            String storedPath = objectStorageService.storeProfilePhoto(file, id, storedName, validated.contentType());
            String publicUrl = objectStorageService.getPublicUrl(storedPath);

            String photoUrl = (publicUrl != null && !publicUrl.isBlank()) ? publicUrl : storedPath;
            target.setProfilePhotoUrl(photoUrl);
            userRepository.save(target);

            return ResponseEntity.ok(Map.of("profilePhotoUrl", photoUrl));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (IOException e) {
            return ResponseEntity.internalServerError().body(Map.of("error", "Upload failed: " + e.getMessage()));
        }
    }

    private User authenticatedUser(Authentication authentication) {

        if (authentication == null || authentication.getName() == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Authentication required");
        }
        return userRepository.findByEmail(authentication.getName())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User not found"));
    }

    private void assertProfileAccess(User actor, User target) {
        boolean isPrivileged = actor.getRole() == Role.SUPER_ADMIN || actor.getRole() == Role.ADMIN;
        if (!isPrivileged && !actor.getId().equals(target.getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Not allowed to access this profile");
        }
    }

    public record UserProfileResponse(
            Long id,
            String name,
            String email,
            String phone,
            Role role,
            String profilePhotoUrl,
            LocalDateTime lastLoginAt,
            LocalDateTime createdAt
    ) {
        public static UserProfileResponse from(User user) {
            return new UserProfileResponse(
                    user.getId(),
                    user.getName(),
                    user.getEmail(),
                    user.getPhone(),
                    user.getRole(),
                    user.getProfilePhotoUrl(),
                    user.getLastLoginAt(),
                    user.getCreatedAt()
            );
        }
    }
}
