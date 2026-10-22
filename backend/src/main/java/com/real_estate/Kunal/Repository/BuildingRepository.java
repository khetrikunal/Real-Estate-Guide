package com.real_estate.Kunal.Repository;

import com.real_estate.Kunal.Entity.Building;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface BuildingRepository extends JpaRepository<Building, Long> {

    List<Building> findByProjectIdOrderByIdAsc(Long projectId);

    Optional<Building> findByIdAndProjectId(Long id, Long projectId);

    long countByProjectId(Long projectId);

    boolean existsByProjectIdAndNameIgnoreCase(Long projectId, String name);
}
