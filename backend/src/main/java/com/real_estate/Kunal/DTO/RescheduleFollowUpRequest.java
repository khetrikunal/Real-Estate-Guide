package com.real_estate.Kunal.DTO;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.time.LocalDateTime;

@Data
public class RescheduleFollowUpRequest {

    @NotNull(message = "New scheduled date/time is required")
    private LocalDateTime scheduledAt;
}
