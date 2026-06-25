package com.real_estate.Kunal.Entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Table(name = "sales")
public class Sale {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long projectId;

    private String projectName;

    private Long configurationId;

    private String configLabel;

    private String propertyType;

    private String listingType;

    private Long unitId;

    private String unitLabel;

    private String unitNo;

    private String floorNo;

    private Double carpetAreaSqft;

    private Double saleableAreaSqft;

    private Double ratePerSqft;

    private Boolean parkingAvailable;

    @Column(name = "parking_cost")
    private Double parkingCost;

    private Double completionPercentage;

    private Long soldByUserId;

    private String soldByName;

    private String soldByRole;

    private String employeeId;

    private Integer unitsSold;

    private Double amount;

    private String buyerName;

    private String buyerPhone;

    private String buyerEmail;

    @Column(length = 2000)
    private String notes;

    private LocalDateTime saleDate;

}
