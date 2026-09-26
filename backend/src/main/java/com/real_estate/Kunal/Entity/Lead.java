package com.real_estate.Kunal.Entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Table(name = "leads")
public class Lead {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String customerName;

    private String phone;

    private String email;

    private String propertyInterest;

    private Long projectId;

    private Long configId;

    @Enumerated(EnumType.STRING)
    private LeadStatus status;

    /**
     * FK to users.id — the user who owns / is assigned this lead.
     * Replaces the old {@code assignedEmployeeId} String field.
     * Added in V11 migration; old column kept for one release for backward compat.
     */
    @Column(name = "assigned_user_id")
    private Long assignedUserId;

    /**
     * @deprecated Use {@link #assignedUserId} instead.
     * Kept for one release while in-flight rows are migrated.
     * Will be dropped in a future schema migration.
     */
    @Deprecated
    @Column(name = "assigned_employee_id", insertable = false, updatable = false)
    private String assignedEmployeeId;

    private String city;

    /**
     * FK to areas.id — the area this lead is associated with.
     * Added in V12 migration alongside the existing {@code city} string column.
     * {@code city} is kept for one release while the frontend migrates.
     * Nullable: not all leads will have a resolvable area immediately.
     */
    @Column(name = "area_id")
    private Long areaId;

}
