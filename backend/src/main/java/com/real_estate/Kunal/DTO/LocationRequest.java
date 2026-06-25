package com.real_estate.Kunal.DTO;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class LocationRequest {

    @NotBlank(message = "Location name is required")
    private String locationName;

    @NotBlank(message = "City is required")
    private String city;

    @NotBlank(message = "State is required")
    private String state;

    private String area;

    @NotNull(message = "Subscription rate is required")
    @DecimalMin(value = "0.0", inclusive = false, message = "Subscription rate must be positive")
    private Double subscriptionRate;

}
