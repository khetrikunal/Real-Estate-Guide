package com.real_estate.Kunal.DTO;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProjectUnitDTO {
    private Long id;
    private Long projectId;
    private Long configId;
    private String unitLabel;
    private String unitNo;
    private String floorNo;
    private String status;
    private LocalDateTime soldAt;
    private Long saleId;
}
