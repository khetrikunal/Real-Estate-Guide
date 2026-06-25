package com.real_estate.Kunal.DTO;

import lombok.Builder;
import lombok.Value;

import java.time.LocalDateTime;

@Value
@Builder
public class CustomCityResponse {
    Long id;
    String state;
    String city;
    Long addedBy;
    LocalDateTime addedAt;
}
