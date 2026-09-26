package com.real_estate.Kunal.Entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Table(name = "employees")
public class Employee {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true)
    private String employeeId;

    private String name;

    private String email;

    private String phone;

    private Long adminId;

    /**
     * FK to users.id.
     * Nullable during migration period; all new Employee rows must have this set.
     * Backfilled from email match by Flyway V10 for existing rows.
     */
    @Column(name = "user_id")
    private Long userId;
}
