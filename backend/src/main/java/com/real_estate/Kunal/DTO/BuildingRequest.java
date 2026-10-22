package com.real_estate.Kunal.DTO;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BuildingRequest {

    @NotBlank(message = "Building name is required")
    private String name;

    private String buildingType; // RESIDENTIAL, COMMERCIAL, MIXED_USE

    @NotNull(message = "Total floors count is required")
    private Integer totalFloors;

    private String towerCode;

    private String description;
}
