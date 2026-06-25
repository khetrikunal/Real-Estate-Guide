package com.real_estate.Kunal.DTO;

import com.real_estate.Kunal.Entity.LeadStatus;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class UpdateLeadStatusRequest {

    @NotNull(message = "Lead ID is required")
    private Long leadId;
    @NotNull(message = "Lead status is required")
    private LeadStatus status;

}
