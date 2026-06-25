package com.real_estate.Kunal.Repository;

import com.real_estate.Kunal.Entity.Project;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

public interface ProjectRepository extends JpaRepository<Project, Long> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT p FROM Project p WHERE p.id = :id")
    java.util.Optional<Project> findByIdForUpdate(@org.springframework.data.repository.query.Param("id") Long id);

    List<Project> findByLocationIdIn(List<Long> locationIds);

    List<Project> findByLocationId(Long locationId);

    List<Project> findByUploadedBy(Long uploadedBy);

    List<Project> findByCityIgnoreCase(String city);

    List<Project> findByCityIgnoreCaseAndAreaIgnoreCase(String city, String area);

    long countByUploadedBy(Long uploadedBy);

    long countByCityIgnoreCase(String city);


    @Query("""
        SELECT DISTINCT p FROM Project p
        INNER JOIN p.configs c
        WHERE
        (:propertyType IS NULL OR c.propertyType = :propertyType)
        AND (:listingType IS NULL OR c.listingType = :listingType)
        AND (:minPrice IS NULL OR c.price >= :minPrice)
        AND (:maxPrice IS NULL OR c.price <= :maxPrice)
        AND (:uploadedBy IS NULL OR p.uploadedBy = :uploadedBy)
    """)
    List<Project> searchProjects(
            @org.springframework.data.repository.query.Param("propertyType") String propertyType,
            @org.springframework.data.repository.query.Param("listingType") String listingType,
            @org.springframework.data.repository.query.Param("minPrice") Double minPrice,
            @org.springframework.data.repository.query.Param("maxPrice") Double maxPrice,
            @org.springframework.data.repository.query.Param("uploadedBy") Long uploadedBy
    );
}