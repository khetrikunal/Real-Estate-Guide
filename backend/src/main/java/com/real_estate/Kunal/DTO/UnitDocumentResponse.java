package com.real_estate.Kunal.DTO;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UnitDocumentResponse {

    private Long id;
    private Long propertyProjectId;
    private Long buildingId;
    private Long floorId;
    private Long unitId;
    private String unitNumber;
    private String documentName;
    private String documentType;
    private String filePath;
    private String fileUrl;
    private Long fileSize;
    private String contentType;
    private Long uploadedBy;
    private String description;
    private Integer version;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
