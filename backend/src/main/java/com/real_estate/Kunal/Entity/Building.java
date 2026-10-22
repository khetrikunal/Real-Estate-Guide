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
@Table(name = "buildings", indexes = {
        @Index(name = "idx_buildings_project", columnList = "project_id")
})
public class Building {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "project_id", nullable = false)
    private Long projectId;

    @Column(nullable = false, length = 120)
    private String name;

    @Column(name = "building_type", length = 50)
    @Builder.Default
    private String buildingType = "MIXED_USE";

    @Column(name = "total_floors", nullable = false)
    @Builder.Default
    private Integer totalFloors = 1;

    @Column(name = "tower_code", length = 50)
    private String towerCode;

    @Column(columnDefinition = "TEXT")
    private String description;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
