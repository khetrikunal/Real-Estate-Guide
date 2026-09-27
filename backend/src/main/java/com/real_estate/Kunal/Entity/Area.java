package com.real_estate.Kunal.Entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Table(name = "areas", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"name", "city", "state"})
})
public class Area {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(nullable = false, length = 100)
    private String city;

    @Builder.Default
    @Column(nullable = false, length = 100)
    private String state = "Maharashtra";

    /** Subscription rate in INR for this area (overrides custom city rate if set) */
    @Column(name = "subscription_rate")
    private Double subscriptionRate;

    @Builder.Default
    @Column(nullable = false)
    private Boolean active = true;

    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();
}
