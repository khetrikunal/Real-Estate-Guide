package com.real_estate.Kunal.Repository;

import com.real_estate.Kunal.Entity.Employee;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface EmployeeRepository extends JpaRepository<Employee, Long> {

    long count();
    List<Employee> findByAdminId(Long adminId);
    Optional<Employee> findByEmail(String email);

}
