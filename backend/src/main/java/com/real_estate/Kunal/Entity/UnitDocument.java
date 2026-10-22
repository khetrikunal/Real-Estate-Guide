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
@Table(name = "unit_documents",
        indexes = {
                @Index(name = "idx_unit_docs_unit", columnList = "unit_id"),
                @Index(name = "idx_unit_docs_project", columnList = "property_project_id")
        })
public class UnitDocument {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "property_project_id", nullable = false)
    private Long propertyProjectId;

    @Column(name = "building_id", nullable = false)
    private Long buildingId;

    @Column(name = "floor_id", nullable = false)
    private Long floorId;

    @Column(name = "unit_id", nullable = false)
    private Long unitId;

    @Column(name = "document_name", nullable = false)
    private String documentName;

    /**
     * FLAT_AGREEMENT, SALE_DEED, OWNERSHIP_DOCS, ALLOTMENT_LETTER,
     * FLOOR_PLAN, PROPERTY_TAX, MAINTENANCE, PAYMENT_RECEIPTS, NOC, OTHER
     */
    @Column(name = "document_type", nullable = false, length = 80)
    private String documentType;

    @Column(name = "object_key", nullable = false, length = 700)
    private String objectKey;

    @Column(name = "file_path", nullable = false, length = 700)
    private String filePath;

    @Column(name = "file_size")
    private Long fileSize;

    @Column(name = "content_type", length = 120)
    private String contentType;

    @Column(name = "uploaded_by")
    private Long uploadedBy;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column
    @Builder.Default
    private Integer version = 1;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
