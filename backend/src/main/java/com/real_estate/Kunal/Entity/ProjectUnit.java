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
@Table(name = "project_units",
        indexes = {
                @Index(name = "idx_project_unit_project", columnList = "project_id"),
                @Index(name = "idx_project_unit_config", columnList = "config_id"),
                @Index(name = "idx_project_unit_status", columnList = "status")
        },
        uniqueConstraints = {
                @UniqueConstraint(name = "uk_project_unit_label", columnNames = {"config_id", "unit_label"})
        })
public class ProjectUnit {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "project_id", nullable = false)
    private Long projectId;

    @Column(name = "config_id", nullable = false)
    private Long configId;

    @Column(name = "unit_label", nullable = false, length = 120)
    private String unitLabel;

    @Column(name = "unit_no", length = 80)
    private String unitNo;

    @Column(name = "floor_no", length = 80)
    private String floorNo;

    @Builder.Default
    @Column(name = "status", nullable = false, length = 20)
    private String status = "AVAILABLE";

    @Column(name = "sold_at")
    private LocalDateTime soldAt;

    @Column(name = "sale_id")
    private Long saleId;
}
