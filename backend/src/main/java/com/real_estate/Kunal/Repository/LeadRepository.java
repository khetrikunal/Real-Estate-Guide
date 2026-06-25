package com.real_estate.Kunal.Repository;


import com.real_estate.Kunal.Entity.Lead;
import com.real_estate.Kunal.Entity.LeadStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface LeadRepository extends JpaRepository<Lead, Long> {
    long countByStatus(LeadStatus status);

    List<Lead> findByAssignedEmployeeIdIn(List<String> assignedEmployeeIds);

    long countByStatusAndAssignedEmployeeIdIn(LeadStatus status, List<String> assignedEmployeeIds);

    long countByAssignedEmployeeId(String assignedEmployeeId);

    long countByCityIgnoreCase(String city);

    @org.springframework.data.jpa.repository.Query("SELECT COUNT(l) FROM Lead l WHERE l.assignedEmployeeId IN :employeeIds")
    long countByAssignedEmployeeIdIn(List<String> employeeIds);
}
