package com.real_estate.Kunal.DTO;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class MapUrlResolveResponse {
    private double latitude;
    private double longitude;
    private String resolvedUrl;
}
