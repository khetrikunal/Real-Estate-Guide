package com.real_estate.Kunal.DTO;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FollowUpDashboardResponse {
    private long totalCount;
    private long overdueCount;
    private long completedCount;
    private long pendingTodayCount;
    private List<FollowUpResponse> items;
}
