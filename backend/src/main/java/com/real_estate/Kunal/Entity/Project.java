package com.real_estate.Kunal.Entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;

import java.util.ArrayList;
import java.util.List;

import com.fasterxml.jackson.annotation.JsonManagedReference;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

@Entity
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Table(name = "projects")
public class Project {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String projectName;

    @Column(name = "location_id")
    private Long locationId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "location_id", insertable = false, updatable = false)
    private Location location;

    @Column(columnDefinition = "TEXT")
    private String description;

    private Long uploadedBy;

    private String address;

    /** @deprecated Legacy geography field. To be replaced by customCity relationship. */
    @Deprecated
    private String city;

    /** @deprecated Legacy geography field. */
    @Deprecated
    private String state;

    /** @deprecated Legacy geography field. To be replaced by area relationship. */
    @Deprecated
    private String area;

    private String zipCode;

    @Column(name = "google_maps_url", columnDefinition = "TEXT")
    private String googleMapsUrl;

    @Column(name = "cover_photo_url")
    private String coverPhotoUrl;

    private Double latitude;

    private Double longitude;

    private String status;

    private String builderName;

    // Property taxonomy
    private String propertyCategory;
    private String propertySubcategory;

    // Project timeline
    private LocalDate possessionDate;

    // UI expects values: Ready_to_Move | Under_Construction | New_Launch
    private String projectStatus;

    // Property Details (project-level summary)
    private Double price;

    @Column(name = "price_per_sq_ft")
    private Double pricePerSqft;

    private Double carpetArea;
    private Double builtUpArea;
    private Double superBuiltUpArea;




    @Column(name = "builder_number")
    private String builderNumber;

    @Column(name = "builder_email")
    private String builderEmail;

    @Column(name = "property_type")
    private String propertyType;

    @Column(name = "apartment_name")
    private String apartmentName;

    @Column(name = "total_land_area")
    private Double totalLandArea;

    @Column(name = "total_land_area_unit")
    @Builder.Default
    private String totalLandAreaUnit = "sq_ft";

    @Column(name = "total_built_up_area")
    private Double totalBuiltUpArea;

    @Column(name = "property_code")
    private String propertyCode;

    @Column(name = "plot_number")
    private String plotNumber;

    @Column(name = "survey_number")
    private String surveyNumber;

    @Column(name = "plot_dimensions")
    private String plotDimensions;

    @Column(name = "ownership_type")
    private String ownershipType;

    @Column(name = "has_multiple_towers")
    @Builder.Default
    private Boolean hasMultipleTowers = false;

    @Column(name = "tower_count")
    @Builder.Default
    private Integer towerCount = 1;

    private LocalDateTime completedAt;

    @OneToMany(mappedBy = "project", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
    @JsonManagedReference
    @Builder.Default
    private List<ProjectConfig> configs = new ArrayList<>();

    public int getTotalUnits() {
        if (configs == null) return 0;
        return configs.stream().mapToInt(ProjectConfig::getUnits).sum();
    }

    public int getUnitsSold() {
        if (configs == null) return 0;
        return configs.stream().mapToInt(ProjectConfig::getUnitsSold).sum();
    }

    public void setUnitsSold(int totalSold) {
        if (configs != null && !configs.isEmpty()) {
            int currentTotal = getUnitsSold();
            int delta = totalSold - currentTotal;
            ProjectConfig first = configs.get(0);
            first.setUnitsSold(first.getUnitsSold() + delta);
        }
    }

    public double getPrice() {
        if (configs == null || configs.isEmpty()) return 0.0;
        return configs.stream().mapToDouble(ProjectConfig::getPrice).min().orElse(0.0);
    }

    public Double getPricePerSqft() {
        return pricePerSqft;
    }

    public void setPricePerSqft(Double pricePerSqft) {
        this.pricePerSqft = pricePerSqft;
    }

    public Double getPricePerSqFt() {
        return pricePerSqft;
    }

    public void setPricePerSqFt(Double pricePerSqFt) {
        this.pricePerSqft = pricePerSqFt;
    }

    @CreationTimestamp
    @Column(updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;

    private Long modifiedBy;

    @Column(name = "is_deleted", nullable = false)
    @Builder.Default
    private Boolean isDeleted = false;

    @Column(name = "deleted_at")
    private LocalDateTime deletedAt;
}
