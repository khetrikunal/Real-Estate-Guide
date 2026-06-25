package com.real_estate.Kunal.Repository;

import com.real_estate.Kunal.Entity.ProjectDocument;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ProjectDocumentRepository extends JpaRepository<ProjectDocument, Long> {

    List<ProjectDocument> findByProjectId(Long projectId);

    List<ProjectDocument> findByProjectIdIn(List<Long> projectIds);

    List<ProjectDocument> findByUploadedBy(Long uploadedBy);

    List<ProjectDocument> findByConfigId(Long configId);

    void deleteByProjectId(Long projectId);

}