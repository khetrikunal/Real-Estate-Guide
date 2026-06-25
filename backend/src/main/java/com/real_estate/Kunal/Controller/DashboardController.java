package com.real_estate.Kunal.Controller;

import com.real_estate.Kunal.DTO.DashboardStatsResponse;
import com.real_estate.Kunal.Service.DashboardService;

import lombok.RequiredArgsConstructor;

import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/dashboard")
@RequiredArgsConstructor
public class DashboardController {

    private final DashboardService dashboardService;

    @GetMapping("/stats")
    public DashboardStatsResponse getStats(){
        return dashboardService.getDashboardStats();
    }

    @GetMapping("/activity")
    public java.util.List<com.real_estate.Kunal.DTO.ActivityResponse> getActivity(){
        return dashboardService.getRecentActivity();
    }

}