package com.real_estate.Kunal.DTO;

import com.real_estate.Kunal.Entity.Role;
import com.real_estate.Kunal.Entity.User;
import java.time.LocalDate;
import java.time.LocalDateTime;

/** Explicit session payload: credentials and raw identity documents never leave this endpoint. */
public record SessionUserResponse(
        Long id, String name, String email, String phone, Role role, String profilePhotoUrl,
        String subscriptionType, String assignedCity, String assignedState, String assignedArea,
        Long customCityId, Long areaId, Double subscriptionRate, LocalDate subscriptionStartAt,
        LocalDate subscriptionExpiresAt, Boolean autoRenewal, Long addedBy, String kycStatus,
        String kycRejectionReason, LocalDateTime lastLoginAt, LocalDateTime createdAt) {
    public static SessionUserResponse from(User user) {
        return new SessionUserResponse(user.getId(), user.getName(), user.getEmail(), user.getPhone(),
                user.getRole(), user.getProfilePhotoUrl(), user.getSubscriptionType(), user.getAssignedCity(),
                user.getAssignedState(), user.getAssignedArea(), user.getCustomCityId(), user.getAreaId(),
                user.getSubscriptionRate(), user.getSubscriptionStartAt(), user.getSubscriptionExpiresAt(),
                user.getAutoRenewal(), user.getAddedBy(), user.getKycStatus(), user.getKycRejectionReason(),
                user.getLastLoginAt(), user.getCreatedAt());
    }
}
