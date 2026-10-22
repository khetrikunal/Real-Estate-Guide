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
public class FloorResponse {

    private Long id;
    private Long projectId;
    private Long buildingId;
    private String buildingName;
    private Integer floorNumber;
    private String floorName;
    private String floorType;
    private Integer totalUnits;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private List<PropertyUnitResponse> units;
}
