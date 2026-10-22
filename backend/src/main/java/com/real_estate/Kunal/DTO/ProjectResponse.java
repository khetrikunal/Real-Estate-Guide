package com.real_estate.Kunal.DTO;

import java.time.LocalDate;
import java.time.LocalDateTime;

import java.util.List;

import lombok.Builder;
import lombok.Value;

@Value
@Builder
public class ProjectResponse {
    Long id;
    String projectName;
    Long locationId;
    Double locationPricing;
    String description;
    Long uploadedBy;
    String addedByName;
    String addedByRole;
    String modifiedByName;
    String modifiedByRole;
    LocalDateTime createdAt;
    LocalDateTime updatedAt;
    String status;
    LocalDateTime completedAt;

    // Property taxonomy
    String propertyCategory;
    String propertySubcategory;

    // Project timeline
    LocalDate possessionDate;

    String projectStatus;

    // Property Details (project-level summary)
    Double price;
    Double pricePerSqFt;
    Double carpetArea;
    Double builtUpArea;
    Double superBuiltUpArea;

    String address;

    String city;
    String area;
    String state;
    String zipCode;
    String googleMapsUrl;
    Double latitude;
    Double longitude;
    String coverPhotoUrl;
    Integer totalUnits;
    Integer unitsSold;
    String builderName;
    String builderNumber;
    String builderEmail;
    String propertyType;
    String apartmentName;
    Double totalLandArea;
    String totalLandAreaUnit;
    Double totalBuiltUpArea;
    String propertyCode;

    // Land & Plot specific
    String plotNumber;
    String surveyNumber;
    String plotDimensions;
    String ownershipType;

    // Building & Tower specific
    Boolean hasMultipleTowers;
    Integer towerCount;

    List<ProjectDocumentResponse> documents;
    List<SaleRecordResponse> sales;
    List<ProjectConfigDTO> configs;
    Boolean isDeleted;
    LocalDateTime deletedAt;
}
