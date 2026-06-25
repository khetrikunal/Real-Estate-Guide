package com.real_estate.Kunal.Repository;

import com.real_estate.Kunal.Entity.OtpRecord;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface OtpRecordRepository extends JpaRepository<OtpRecord, Long> {

    void deleteByEmailAndPurposeAndIsUsedFalse(String email, String purpose);

    Optional<OtpRecord> findTopByEmailAndPurposeAndIsUsedFalseOrderByCreatedAtDesc(String email, String purpose);

    List<OtpRecord> findByEmailAndPurposeAndCreatedAtAfter(String email, String purpose, LocalDateTime after);
}
