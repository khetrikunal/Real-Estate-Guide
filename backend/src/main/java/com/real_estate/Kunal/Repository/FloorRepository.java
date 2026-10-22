package com.real_estate.Kunal.Repository;

import com.real_estate.Kunal.Entity.Floor;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface FloorRepository extends JpaRepository<Floor, Long> {

    List<Floor> findByBuildingIdOrderByFloorNumberAsc(Long buildingId);

    List<Floor> findByProjectIdOrderByBuildingIdAscFloorNumberAsc(Long projectId);

    Optional<Floor> findByIdAndBuildingId(Long id, Long buildingId);

    long countByBuildingId(Long buildingId);

    long countByProjectId(Long projectId);

    boolean existsByBuildingIdAndFloorNumber(Long buildingId, Integer floorNumber);
}
