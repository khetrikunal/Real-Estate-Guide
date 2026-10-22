package com.real_estate.Kunal.DTO;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FloorRequest {

    @NotNull(message = "Floor number is required")
    private Integer floorNumber;

    @NotBlank(message = "Floor name is required")
    private String floorName; // Ground Floor, 1st Floor, 2nd Floor, etc.

    private String floorType; // RESIDENTIAL, COMMERCIAL, MIXED, PARKING
}
