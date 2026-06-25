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

    private String assignedEmployeeId;

    private String city;

}
