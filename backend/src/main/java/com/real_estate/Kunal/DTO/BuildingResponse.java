package com.real_estate.Kunal.DTO;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BuildingResponse {

    private Long id;
    private Long projectId;
    private String name;
    private String buildingType;
    private Integer totalFloors;
    private String description;
    private String towerCode;
    private Integer configuredFloors;
    private Integer totalUnits;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private List<FloorResponse> floors;
}
