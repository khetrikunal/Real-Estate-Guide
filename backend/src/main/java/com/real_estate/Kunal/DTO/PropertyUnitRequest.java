package com.real_estate.Kunal.DTO;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PropertyUnitRequest {

    private Long buildingId;
    private Long floorId;

    @NotBlank(message = "Unit number is required")
    private String unitNumber;

    /**
     * FLAT, SHOP, OFFICE, STUDIO, PENTHOUSE, PARKING, STORAGE, OTHER
     */
    @NotBlank(message = "Unit type is required")
    private String unitType;

    /**
     * 1 BHK, 2 BHK, 3 BHK, 4 BHK, Studio, Retail, Showroom, etc.
     */
    private String subType;

    private Double carpetArea;
    private String carpetAreaUnit; // sq_ft, sq_m

    private Double builtUpArea;
    private String builtUpAreaUnit;

    private Double superBuiltUpArea;

    private Integer bedrooms;
    private Integer bathrooms;
    private Integer balconies;
    private Integer parkingSpaces;

    private String facing; // East, North, North-East, West, South, etc.

    private Double price;
    private Double rentPrice;

    /**
     * AVAILABLE, RESERVED, SOLD, RENTED, UNAVAILABLE
     */
    private String status;

    private String ownerName;
    private String ownerPhone;
    private String ownerEmail;

    private String description;
    private String coverImageUrl;
    private String floorPlanUrl;
}
