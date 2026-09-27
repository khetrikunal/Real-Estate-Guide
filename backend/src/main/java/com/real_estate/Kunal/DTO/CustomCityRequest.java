package com.real_estate.Kunal.DTO;

import lombok.Data;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

@Data
public class CustomCityRequest {

    @NotBlank
    private String state;

    @NotBlank
    @Size(min = 2, max = 100)
    private String city;

    private Double subscriptionRate;
}
