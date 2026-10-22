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
@Table(name = "project_documents")
public class ProjectDocument {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String fileName;

    private String fileType;

    private String filePath;

    private Long projectId;

    private Long configId;  // nullable — when set, doc belongs to this config
    private Long buildingId; // nullable — when set, doc belongs to this building/tower
    private String documentLevel; // PROPERTY, BUILDING, TOWER, CONFIG, UNIT
    private String documentCategory; // TITLE_DEED, 7_12_EXTRACT, NA_ORDER, SANCTION_PLAN, CC, OC, etc.

    private Long uploadedBy;

    private Long fileSize;

    private LocalDateTime uploadedAt;

}