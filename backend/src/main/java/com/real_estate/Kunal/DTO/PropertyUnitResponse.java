package com.real_estate.Kunal.DTO;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PropertyUnitResponse {

    private Long id;
    private Long propertyProjectId;
    private String projectName;
    private Long buildingId;
    private String buildingName;
    private Long floorId;
    private String floorName;
    private Integer floorNumber;

    private String unitNumber;
    private String unitType;
    private String subType;

    private Double carpetArea;
    private String carpetAreaUnit;
    private Double builtUpArea;
    private String builtUpAreaUnit;
    private Double superBuiltUpArea;

    private Integer bedrooms;
    private Integer bathrooms;
    private Integer balconies;
    private Integer parkingSpaces;
    private String facing;

    private Double price;
    private Double rentPrice;
    private String status;

    private String ownerName;
    private String ownerPhone;
    private String ownerEmail;

    private String description;
    private String coverImageUrl;
    private String floorPlanUrl;

    private Integer documentCount;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    private List<UnitDocumentResponse> documents;
}
