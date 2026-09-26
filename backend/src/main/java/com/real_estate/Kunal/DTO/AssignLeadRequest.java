package com.real_estate.Kunal.DTO;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class AssignLeadRequest {

    @NotNull(message = "Lead ID is required")
    private Long leadId;

    /**
     * The user ID (users.id) to assign this lead to.
     * Previously accepted as a String; now a proper Long FK.
     */
    @NotNull(message = "User ID is required")
    private Long userId;

}
