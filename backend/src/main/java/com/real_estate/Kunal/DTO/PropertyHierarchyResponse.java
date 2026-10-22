package com.real_estate.Kunal.DTO;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PropertyHierarchyResponse {

    private Long propertyId;
    private String propertyName;
    private String propertyCode;
    private String propertyType;
    private String city;
    private String area;
    private String status;

    // Dashboard Summary statistics calculated from actual database records
    private long totalBuildings;
    private long totalFloors;
    private long totalResidentialUnits;
    private long totalCommercialUnits;
    private long availableUnits;
    private long reservedUnits;
    private long soldUnits;
    private long rentedUnits;
    private long totalUnits;

    // Hierarchy tree: Buildings -> Floors -> Units
    private List<BuildingResponse> buildings;
}
