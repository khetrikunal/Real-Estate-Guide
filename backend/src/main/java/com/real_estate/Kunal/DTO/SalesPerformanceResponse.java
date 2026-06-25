package com.real_estate.Kunal.DTO;

import java.util.List;

import lombok.Builder;
import lombok.Value;

@Value
@Builder
public class SalesPerformanceResponse {
    String range;
    String groupBy;
    List<SalesPerformanceSeriesResponse> series;
}
