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
@Table(name = "custom_cities", uniqueConstraints = {
        @UniqueConstraint(columnNames = {"state", "city"})
})
public class CustomCity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String state;

    @Column(nullable = false)
    private String city;

    /** Subscription rate in INR for this city */
    @Column(name = "subscription_rate")
    private Double subscriptionRate;

    @Builder.Default
    @Column(nullable = false)
    private Boolean active = true;

    /** ID of the SuperAdmin who added this city */
    private Long addedBy;

    @Builder.Default
    private LocalDateTime addedAt = LocalDateTime.now();
}
