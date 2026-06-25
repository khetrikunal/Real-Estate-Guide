package com.real_estate.Kunal.DTO;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FollowUpResponse {
    private Long id;
    private Long leadId;
    private String customerName;
    private String leadPhone;
    private String leadEmail;
    private String leadStatus;
    private String propertyInterest;
    private Long projectId;
    private Long configId;
    private String city;
    private Long createdByUserId;
    private Long ownerUserId;
    private String callingType;
    private String description;
    private LocalDateTime scheduledAt;
    private LocalDateTime completedAt;
    private Boolean isCompleted;
    private String completionNote;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
