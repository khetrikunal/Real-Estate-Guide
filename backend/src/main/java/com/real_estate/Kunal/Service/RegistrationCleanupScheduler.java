package com.real_estate.Kunal.Service;

import com.real_estate.Kunal.Entity.TempRegistration;
import com.real_estate.Kunal.Repository.TempRegistrationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Scheduled cleanup jobs for the temp_registrations table.
 * Runs every 5 minutes to handle retries, expiries, and permanent deletions.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class RegistrationCleanupScheduler {

    private final TempRegistrationRepository tempRepo;
    private final SubAdminRegistrationService registrationService;

    /**
     * Job 1: Retry PAID records that failed promotion.
     * Finds temp registrations stuck in PAID status for more than 5 minutes
     * and re-attempts the promotion transaction.
     */
    @Scheduled(fixedRate = 300_000) // 5 minutes
    public void retryPaidRecords() {
        LocalDateTime cutoff = LocalDateTime.now().minusMinutes(5);
        List<TempRegistration> stuckPaid = tempRepo
                .findByStatusAndCompletedAtIsNullAndCreatedAtBefore("PAID", cutoff);

        if (stuckPaid.isEmpty()) return;

        log.info("Retrying {} stuck PAID registrations", stuckPaid.size());

        for (TempRegistration temp : stuckPaid) {
            try {
                registrationService.promoteToUser(temp);
                log.info("Retry succeeded for temp registration {}", temp.getId());
            } catch (Exception e) {
                log.error("Retry failed for temp registration {}: {}", temp.getId(), e.getMessage());
            }
        }
    }

    /**
     * Job 2: Expire old PENDING records past their expiry time (24 hours).
     */
    @Scheduled(fixedRate = 300_000) // 5 minutes
    public void expirePendingRecords() {
        List<TempRegistration> expired = tempRepo
                .findByStatusAndExpiresAtBefore("PENDING", LocalDateTime.now());

        if (expired.isEmpty()) return;

        log.info("Expiring {} PENDING registrations past their 24hr window", expired.size());

        for (TempRegistration temp : expired) {
            temp.setStatus("EXPIRED");
            tempRepo.save(temp);
        }
    }

    /**
     * Job 3: Permanently delete FAILED and EXPIRED records older than 30 minutes.
     * This frees up the email for reuse.
     */
    @Scheduled(fixedRate = 300_000) // 5 minutes
    public void deleteOldRecords() {
        LocalDateTime cutoff = LocalDateTime.now().minusMinutes(30);
        int deleted = tempRepo.deleteByStatusInAndCreatedAtBefore(
                List.of("FAILED", "EXPIRED"), cutoff);

        if (deleted > 0) {
            log.info("Permanently deleted {} old FAILED/EXPIRED temp registrations", deleted);
        }
    }
}
