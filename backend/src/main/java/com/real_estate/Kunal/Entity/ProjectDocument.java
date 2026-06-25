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

    private Long uploadedBy;

    private Long fileSize;

    private LocalDateTime uploadedAt;

}