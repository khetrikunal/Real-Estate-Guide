package com.real_estate.Kunal.DTO;

import lombok.Builder;
import lombok.Value;

@Value
@Builder
public class SalesPerformancePointResponse {
    int index;
    String label;
    int unitsSold;
}
