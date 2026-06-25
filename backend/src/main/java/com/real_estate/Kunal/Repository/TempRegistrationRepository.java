package com.real_estate.Kunal.Repository;

import com.real_estate.Kunal.Entity.TempRegistration;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface TempRegistrationRepository extends JpaRepository<TempRegistration, UUID> {

    /** Resume flow — find pending/paid registration for this email */
    Optional<TempRegistration> findFirstByEmailIgnoreCaseAndStatusIn(String email, List<String> statuses);

    /** Webhook lookup by Razorpay order ID */
    Optional<TempRegistration> findByRazorpayOrderId(String razorpayOrderId);

    /** Frontend verification by registration token */
    Optional<TempRegistration> findByRegistrationToken(UUID registrationToken);

    /** Find expired PENDING records */
    List<TempRegistration> findByStatusAndExpiresAtBefore(String status, LocalDateTime cutoff);

    /** Find PAID records stuck for retry */
    List<TempRegistration> findByStatusAndCompletedAtIsNullAndCreatedAtBefore(String status, LocalDateTime cutoff);

    /** Find old FAILED/EXPIRED records for permanent deletion */
    List<TempRegistration> findByStatusInAndCreatedAtBefore(List<String> statuses, LocalDateTime cutoff);

    /** Delete old failed/expired records */
    @Modifying
    @Transactional
    @Query("DELETE FROM TempRegistration t WHERE t.status IN :statuses AND t.createdAt < :cutoff")
    int deleteByStatusInAndCreatedAtBefore(@Param("statuses") List<String> statuses,
                                           @Param("cutoff") LocalDateTime cutoff);

    /** Check if email has a pending or paid temp registration */
    boolean existsByEmailIgnoreCaseAndStatusIn(String email, List<String> statuses);
}
