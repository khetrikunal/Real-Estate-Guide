package com.real_estate.Kunal.Repository;

import com.real_estate.Kunal.Entity.UnitDocument;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UnitDocumentRepository extends JpaRepository<UnitDocument, Long> {

    List<UnitDocument> findByUnitIdOrderByCreatedAtDesc(Long unitId);

    List<UnitDocument> findByPropertyProjectIdOrderByCreatedAtDesc(Long propertyProjectId);

    Optional<UnitDocument> findByIdAndUnitId(Long id, Long unitId);

    long countByUnitId(Long unitId);
}
