package com.real_estate.Kunal.DTO;

import java.time.LocalDateTime;

import lombok.Builder;
import lombok.Value;

@Value
@Builder
public class SaleRecordResponse {
    Long id;
    Long projectId;
    String projectName;
    Long configurationId;
    String configLabel;
    String propertyType;
    String listingType;
    Long unitId;
    String unitLabel;
    String unitNo;
    String floorNo;
    Double carpetAreaSqft;
    Double saleableAreaSqft;
    Double ratePerSqft;
    Boolean parkingAvailable;
    Double parkingCost;
    Double completionPercentage;
    Long soldByUserId;
    String soldByName;
    String soldByRole;
    Integer unitsSold;
    Double amount;
    LocalDateTime saleDate;
    String buyerName;
    String buyerPhone;
    String buyerEmail;
    String notes;
}
