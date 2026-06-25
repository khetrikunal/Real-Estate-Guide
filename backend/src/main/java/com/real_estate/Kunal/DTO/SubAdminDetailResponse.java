package com.real_estate.Kunal.DTO;

import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class SubAdminDetailResponse {
    private UserManagementResponse profile;
    private Integer projectsCount;
    private List<PaymentHistoryItemResponse> paymentHistory;
}
