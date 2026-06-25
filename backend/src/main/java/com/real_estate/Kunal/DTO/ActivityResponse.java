package com.real_estate.Kunal.DTO;

import lombok.Builder;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@Builder
public class ActivityResponse {
    private Long id;
    private String type;
    private String description;
    private String userName;
    private String projectName;
    private String city;
    private LocalDateTime timestamp;
    private Integer units;
}
