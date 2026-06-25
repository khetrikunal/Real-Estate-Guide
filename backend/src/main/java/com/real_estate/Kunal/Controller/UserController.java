package com.real_estate.Kunal.Controller;

import com.real_estate.Kunal.DTO.UpdateProfileRequest;
import com.real_estate.Kunal.Entity.Role;
import com.real_estate.Kunal.Entity.User;
import com.real_estate.Kunal.Repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.security.core.Authentication;

import java.time.LocalDateTime;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final UserRepository userRepository;

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
