package com.real_estate.Kunal.Repository;

import com.real_estate.Kunal.Entity.Lead;
import com.real_estate.Kunal.Entity.LeadStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface LeadRepository extends JpaRepository<Lead, Long> {

    long countByStatus(LeadStatus status);

    /** Find all leads assigned to any of the given user IDs. */
    List<Lead> findByAssignedUserIdIn(List<Long> assignedUserIds);

    long countByStatusAndAssignedUserIdIn(LeadStatus status, List<Long> assignedUserIds);

    long countByAssignedUserId(Long assignedUserId);

    long countByCityIgnoreCase(String city);

    @org.springframework.data.jpa.repository.Query(
            "SELECT COUNT(l) FROM Lead l WHERE l.assignedUserId IN :userIds")
    long countByAssignedUserIdIn(List<Long> userIds);
}
