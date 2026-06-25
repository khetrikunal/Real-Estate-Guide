0package com.real_estate.Kunal.DTO;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;
import java.util.List;

import lombok.Data;



@Data
public class ProjectRequest {

    @NotBlank(message = "Project name is required")
    @Size(max = 150, message = "Project name is too long")
    private String projectName;

    private Long locationId;

    private String description;

    private Long uploadedBy;

    private String address;

    @NotBlank(message = "City is required")
    private String city;

    private String area;

    @NotBlank(message = "State is required")
    private String state;

    private String zipCode;

    private String googleMapsUrl;

    private Double latitude;

    private Double longitude;

    private String status;

    // Property taxonomy
    private String propertyCategory;
    private String propertySubcategory;

    // Project timeline
    private LocalDate possessionDate;

    // UI expects these values: Ready_to_Move | Under_Construction | New_Launch
    private String projectStatus;

    // Property Details (project-level summary)
    private Double price;
    private Double pricePerSqFt;
    private Double carpetArea;
    private Double builtUpArea;
    private Double superBuiltUpArea;

    // Keep backward compatibility: tests create projects without builderName.
    private String builderName;

    private String builderNumber;

    // Multi-config: list of sub-configs (e.g. multiple BHK types + shops)
    @Valid
    private List<ProjectConfigDTO> configs;
}
