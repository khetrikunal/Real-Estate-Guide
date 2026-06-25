package com.real_estate.Kunal.DTO;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class AssignLeadRequest {

    @NotNull(message = "Lead ID is required")
    private Long leadId;

    @NotBlank(message = "Employee ID is required")
    private String employeeId;

}
