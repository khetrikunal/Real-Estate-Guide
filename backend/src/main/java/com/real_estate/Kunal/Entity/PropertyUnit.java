package com.real_estate.Kunal.Entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Table(name = "property_units",
        indexes = {
                @Index(name = "idx_units_project", columnList = "property_project_id"),
                @Index(name = "idx_units_building", columnList = "building_id"),
                @Index(name = "idx_units_floor", columnList = "floor_id"),
                @Index(name = "idx_units_status", columnList = "status"),
                @Index(name = "idx_units_type", columnList = "unit_type")
        },
        uniqueConstraints = {
                @UniqueConstraint(name = "uk_floor_unit_number", columnNames = {"floor_id", "unit_number"})
        })
public class PropertyUnit {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "property_project_id", nullable = false)
    private Long propertyProjectId;

    @Column(name = "building_id", nullable = false)
    private Long buildingId;

    @Column(name = "floor_id", nullable = false)
    private Long floorId;

    @Column(name = "unit_number", nullable = false, length = 80)
    private String unitNumber;

    /**
     * FLAT, SHOP, OFFICE, STUDIO, PENTHOUSE, PARKING, STORAGE, OTHER
     */
    @Column(name = "unit_type", nullable = false, length = 50)
    private String unitType;

    /**
     * 1 BHK, 2 BHK, 3 BHK, 4 BHK, Studio, Retail, Showroom, etc.
     */
    @Column(name = "sub_type", length = 50)
    private String subType;

    @Column(name = "carpet_area")
    private Double carpetArea;

    @Column(name = "carpet_area_unit", length = 20)
    @Builder.Default
    private String carpetAreaUnit = "sq_ft";

    @Column(name = "built_up_area")
    private Double builtUpArea;

    @Column(name = "built_up_area_unit", length = 20)
    @Builder.Default
    private String builtUpAreaUnit = "sq_ft";

    @Column(name = "super_built_up_area")
    private Double superBuiltUpArea;

    private Integer bedrooms;
    private Integer bathrooms;
    private Integer balconies;

    @Column(name = "parking_spaces")
    private Integer parkingSpaces;

    @Column(length = 50)
    private String facing;

    private Double price;

    @Column(name = "rent_price")
    private Double rentPrice;

    /**
     * AVAILABLE, RESERVED, SOLD, RENTED, UNAVAILABLE
     */
    @Column(nullable = false, length = 30)
    @Builder.Default
    private String status = "AVAILABLE";

    @Column(name = "owner_name", length = 150)
    private String ownerName;

    @Column(name = "owner_phone", length = 50)
    private String ownerPhone;

    @Column(name = "owner_email", length = 150)
    private String ownerEmail;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "cover_image_url", length = 700)
    private String coverImageUrl;

    @Column(name = "floor_plan_url", length = 700)
    private String floorPlanUrl;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
