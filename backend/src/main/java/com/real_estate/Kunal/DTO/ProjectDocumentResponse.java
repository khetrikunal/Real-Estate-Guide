package com.real_estate.Kunal.DTO;

import java.time.LocalDateTime;

import lombok.Builder;
import lombok.Value;

@Value
@Builder
public class ProjectDocumentResponse {
    Long id;
    String fileName;
    String fileType;
    String filePath;
    String fileUrl;
    Long projectId;
    Long configId;
    Long buildingId;
    String documentLevel;
    String documentCategory;
    Long uploadedBy;
    Long fileSize;
    LocalDateTime uploadedAt;
}