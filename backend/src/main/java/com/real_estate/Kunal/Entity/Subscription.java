package com.real_estate.Kunal.Entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;

@Entity
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Table(name = "subscriptions")
public class Subscription {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long userId;

    private Long planId;

    @Enumerated(EnumType.STRING)
    private PlanType planType;

    private Double price;

    private LocalDate startDate;

    private LocalDate endDate;

    private String status;

}