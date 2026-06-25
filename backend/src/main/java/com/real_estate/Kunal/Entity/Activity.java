package com.real_estate.Kunal.Entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "activities")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Activity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String type; // PROJECT_ADDED, UNIT_SOLD
    private String description;
    private String userName;
    private String projectName;
    private String city;
    private LocalDateTime timestamp;
    private Long userId;
    private Integer units;
}
