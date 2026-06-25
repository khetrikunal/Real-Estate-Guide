package com.real_estate.Kunal.Repository;

import com.real_estate.Kunal.Entity.FollowUp;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;

public interface FollowUpRepository extends JpaRepository<FollowUp, Long> {

    /** Follow-ups for a lead (detail view), sorted by scheduled ascending */
    List<FollowUp> findByLeadIdAndDeletedAtIsNullOrderByScheduledAtAsc(Long leadId);

    /** Dashboard: follow-ups for owners in a date range */
    List<FollowUp> findByOwnerUserIdInAndScheduledAtBetweenAndDeletedAtIsNullOrderByScheduledAtAsc(
            List<Long> ownerUserIds, LocalDateTime from, LocalDateTime to);

    @Query("SELECT f FROM FollowUp f WHERE f.deletedAt IS NULL " +
           "AND f.scheduledAt BETWEEN :from AND :to " +
           "AND (f.ownerUserId IN :visibleUserIds OR f.createdByUserId IN :visibleUserIds)")
    List<FollowUp> findVisibleDashboardFollowUps(
            @Param("visibleUserIds") List<Long> visibleUserIds,
            @Param("from") LocalDateTime from,
            @Param("to") LocalDateTime to);

    /** Overdue count: incomplete, not deleted, scheduled before now */
    long countByOwnerUserIdInAndIsCompletedFalseAndDeletedAtIsNullAndScheduledAtBefore(
            List<Long> ownerUserIds, LocalDateTime before);

    /** Today's pending count for badge: incomplete, not deleted, scheduled today */
    long countByOwnerUserIdInAndIsCompletedFalseAndDeletedAtIsNullAndScheduledAtBetween(
            List<Long> ownerUserIds, LocalDateTime from, LocalDateTime to);

    @Query("SELECT COUNT(f) FROM FollowUp f WHERE f.deletedAt IS NULL " +
           "AND f.isCompleted = false AND f.scheduledAt BETWEEN :from AND :to " +
           "AND (f.ownerUserId IN :visibleUserIds OR f.createdByUserId IN :visibleUserIds)")
    long countVisiblePendingBetween(
            @Param("visibleUserIds") List<Long> visibleUserIds,
            @Param("from") LocalDateTime from,
            @Param("to") LocalDateTime to);

    /** Reminder lookup: due follow-ups within a time window */
    List<FollowUp> findByIsCompletedFalseAndDeletedAtIsNullAndScheduledAtBetween(
            LocalDateTime from, LocalDateTime to);

    /** Next follow-up per lead (for CRM list summary) */
    @Query("SELECT f FROM FollowUp f WHERE f.lead.id IN :leadIds " +
           "AND f.deletedAt IS NULL AND f.isCompleted = false " +
           "AND f.scheduledAt = (SELECT MIN(f2.scheduledAt) FROM FollowUp f2 " +
           "WHERE f2.lead.id = f.lead.id AND f2.deletedAt IS NULL AND f2.isCompleted = false)")
    List<FollowUp> findNextFollowUpForLeads(@Param("leadIds") List<Long> leadIds);
}
