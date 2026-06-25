package com.real_estate.Kunal.Repository;

import com.real_estate.Kunal.Entity.ProjectConfig;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;

import java.util.List;
import java.util.Optional;

public interface ProjectConfigRepository extends JpaRepository<ProjectConfig, Long> {
    List<ProjectConfig> findByProjectId(Long projectId);
    void deleteByProjectId(Long projectId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    Optional<ProjectConfig> findByIdAndProjectId(Long id, Long projectId);
}
