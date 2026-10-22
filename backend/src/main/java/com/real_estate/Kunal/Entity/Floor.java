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
@Table(name = "floors",
        indexes = {
                @Index(name = "idx_floors_building", columnList = "building_id"),
                @Index(name = "idx_floors_project", columnList = "project_id")
        },
        uniqueConstraints = {
                @UniqueConstraint(name = "uk_building_floor", columnNames = {"building_id", "floor_number"})
        })
public class Floor {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "project_id", nullable = false)
    private Long projectId;

    @Column(name = "building_id", nullable = false)
    private Long buildingId;

    @Column(name = "floor_number", nullable = false)
    private Integer floorNumber;

    @Column(name = "floor_name", nullable = false, length = 100)
    private String floorName;

    @Column(name = "floor_type", nullable = false, length = 50)
    @Builder.Default
    private String floorType = "MIXED";

    @Column(name = "total_units")
    @Builder.Default
    private Integer totalUnits = 0;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
