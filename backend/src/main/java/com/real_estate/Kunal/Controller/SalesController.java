package com.real_estate.Kunal.Controller;

import com.real_estate.Kunal.DTO.SaleRecordRequest;
import com.real_estate.Kunal.DTO.SaleRecordResponse;
import com.real_estate.Kunal.DTO.SalesAnalyticsResponse;
import com.real_estate.Kunal.DTO.SalesPerformanceResponse;
import com.real_estate.Kunal.Entity.Sale;
import com.real_estate.Kunal.Service.SalesService;

import lombok.RequiredArgsConstructor;

import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/sales")
@RequiredArgsConstructor
public class SalesController {

    private final SalesService salesService;

    @PostMapping("/record")
    public Sale recordSale(@RequestBody SaleRecordRequest request) {
        return salesService.recordSale(request);
    }

    @GetMapping("/analytics")
    public SalesAnalyticsResponse getAnalytics(){
        return salesService.getAnalytics();
    }

    /**
     * GET /api/sales?role=admin  — returns all sale records (with soldBy populated).
     * No role param or employee role returns current user's sales only.
     */
    @GetMapping
    public List<SaleRecordResponse> getSales(
            @RequestParam(required = false) String role
    ) {
        // Role from query params is ignored server-side. Scoping is derived from JWT identity.
        return salesService.getSales(role);
    }

    /**
     * GET /api/sales/performance?userId=X&range=7d|30d&groupBy=seller
     * Aggregates unitsSold per day (weekly) or per week (monthly).
     * groupBy=seller returns one series per top-5 seller + "Others".
     */
    @GetMapping("/performance")
    public SalesPerformanceResponse getPerformance(
            @RequestParam(required = false) Long userId,
            @RequestParam(required = false, defaultValue = "7d") String range,
            @RequestParam(required = false) String groupBy
    ) {
        return salesService.getPerformance(userId, range, groupBy);
    }

}