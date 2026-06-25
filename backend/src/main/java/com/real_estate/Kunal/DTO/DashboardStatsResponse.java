package com.real_estate.Kunal.DTO;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class DashboardStatsResponse {

    private long totalProjects;
    private long totalSales;
    private long totalAdmins;
    private long totalSubAdmins;
    private long totalEmployees;
    private long totalLeads;
    private double revenue;

}