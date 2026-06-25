package com.real_estate.Kunal.DTO;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.time.LocalDateTime;

@Data
public class CreateFollowUpRequest {

    @NotNull(message = "Owner user ID is required")
    private Long ownerUserId;

    @NotNull(message = "Calling type is required")
    private String callingType;

    private String description;

    @NotNull(message = "Scheduled date/time is required")
    private LocalDateTime scheduledAt;
}
