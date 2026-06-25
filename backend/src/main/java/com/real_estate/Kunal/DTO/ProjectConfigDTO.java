package com.real_estate.Kunal.DTO;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProjectConfigDTO {
    private Long id;
    private String configLabel;   // e.g. "1 BHK", "2 BHK", "Shop"
    private String propertyType;
    private String listingType;
    private Integer completionPercentage;
    private Integer units;
    private Integer unitsSold;
    private Integer availableUnits;
    private Double price;
    private String floorNo;
    private String flatType;
    private Double carpetAreaSqft;
    private Double saleableAreaSqft;
    private Double ratePerSqft;
    private Boolean parkingAvailable;
    private Double parkingCost;
    private List<String> unitLabels;
    private List<ProjectUnitDTO> unitInventory;
    private List<ProjectDocumentResponse> documents;
}
