package com.real_estate.Kunal.Entity;

import com.fasterxml.jackson.annotation.JsonBackReference;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Table(name = "project_configs")
public class ProjectConfig {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "project_id", nullable = false)
    @JsonBackReference
    private Project project;

    private String configLabel;   // e.g. "1 BHK", "2 BHK", "Shop", "3 BHK"

    private String propertyType;  // e.g. "Flat", "Shop", "Land"

    private String listingType;   // e.g. "Sell", "Rental"

    private int completionPercentage;

    private int units;

    private int unitsSold;

    private double price;

    @Column(name = "floor_no")
    private String floorNo;

    @Column(name = "flat_type")
    private String flatType;

    @Column(name = "carpet_area_sqft")
    private Double carpetAreaSqft;

    @Column(name = "saleable_area_sqft")
    private Double saleableAreaSqft;

    @Column(name = "rate_per_sqft")
    private Double ratePerSqft;

    @Column(name = "parking_available")
    private Boolean parkingAvailable;

    @Column(name = "parking_cost")
    private Double parkingCost;
}
