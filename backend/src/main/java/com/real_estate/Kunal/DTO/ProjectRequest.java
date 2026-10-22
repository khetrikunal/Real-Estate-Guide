package com.real_estate.Kunal.DTO;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;
import java.util.List;

import lombok.Data;

@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class ProjectRequest {

    @Size(max = 150, message = "Project name is too long")
    private String projectName;

    // Land & Plot specific
    private String plotNumber;
    private String surveyNumber;
    private String plotDimensions;
    private String ownershipType;

    // Building & Tower specific
    private Boolean hasMultipleTowers;
    private Integer towerCount;

    private Long locationId;

    private String description;

    private Long uploadedBy;

    private String address;

    private String city;

    private String area;

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

    private String builderName;

    private String builderNumber;

    private String builderEmail;

    private String propertyType;

    private String apartmentName;

    private Double totalLandArea;

    private String totalLandAreaUnit;

    private Double totalBuiltUpArea;

    private String propertyCode;

    private Integer totalUnits;

    private Integer completionPercentage;

    // Multi-config: list of sub-configs (e.g. multiple BHK types + shops)
    @Valid
    private List<ProjectConfigDTO> configs;
}
