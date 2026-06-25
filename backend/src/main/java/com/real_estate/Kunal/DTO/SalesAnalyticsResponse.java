package com.real_estate.Kunal.DTO;

import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class SalesAnalyticsResponse {

    private Double totalSales;

    private Long totalTransactions;

    private List<MonthlySales> monthlySales;

}