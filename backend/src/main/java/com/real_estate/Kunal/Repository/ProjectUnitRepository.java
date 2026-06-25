package com.real_estate.Kunal.Repository;

import com.real_estate.Kunal.Entity.ProjectUnit;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;

import jakarta.persistence.LockModeType;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface ProjectUnitRepository extends JpaRepository<ProjectUnit, Long> {
    List<ProjectUnit> findByProjectId(Long projectId);
    List<ProjectUnit> findByConfigId(Long configId);
    List<ProjectUnit> findByConfigIdAndStatus(Long configId, String status);
    int countByConfigIdAndStatus(Long configId, String status);
    void deleteByProjectId(Long projectId);
    void deleteByConfigIdIn(Collection<Long> configIds);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    Optional<ProjectUnit> findByIdAndProjectIdAndConfigId(Long id, Long projectId, Long configId);
}
