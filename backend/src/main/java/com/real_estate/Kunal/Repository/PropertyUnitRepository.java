package com.real_estate.Kunal.Repository;

import com.real_estate.Kunal.Entity.PropertyUnit;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PropertyUnitRepository extends JpaRepository<PropertyUnit, Long> {

    List<PropertyUnit> findByFloorIdOrderByUnitNumberAsc(Long floorId);

    List<PropertyUnit> findByBuildingIdOrderByFloorIdAscUnitNumberAsc(Long buildingId);

    List<PropertyUnit> findByPropertyProjectIdOrderByBuildingIdAscFloorIdAscUnitNumberAsc(Long propertyProjectId);

    Optional<PropertyUnit> findByIdAndPropertyProjectId(Long id, Long propertyProjectId);

    Optional<PropertyUnit> findByIdAndFloorId(Long id, Long floorId);

    boolean existsByFloorIdAndUnitNumberIgnoreCase(Long floorId, String unitNumber);

    long countByPropertyProjectId(Long propertyProjectId);

    long countByFloorId(Long floorId);

    long countByBuildingId(Long buildingId);

    long countByPropertyProjectIdAndUnitTypeIgnoreCase(Long propertyProjectId, String unitType);

    long countByPropertyProjectIdAndStatusIgnoreCase(Long propertyProjectId, String status);

    @Query("SELECT COUNT(u) FROM PropertyUnit u WHERE u.propertyProjectId = :projectId AND u.unitType IN ('FLAT', 'STUDIO', 'PENTHOUSE', 'RESIDENTIAL')")
    long countResidentialUnits(@Param("projectId") Long projectId);

    @Query("SELECT COUNT(u) FROM PropertyUnit u WHERE u.propertyProjectId = :projectId AND u.unitType IN ('SHOP', 'OFFICE', 'COMMERCIAL', 'STORAGE')")
    long countCommercialUnits(@Param("projectId") Long projectId);
}
