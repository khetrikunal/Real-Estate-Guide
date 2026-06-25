package com.real_estate.Kunal.DTO;

import java.util.List;

import lombok.Builder;
import lombok.Value;

@Value
@Builder
public class SalesPerformanceSeriesResponse {
    String name;
    String role;
    List<SalesPerformancePointResponse> points;
}
