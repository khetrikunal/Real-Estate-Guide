package com.real_estate.Kunal.DTO;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class PaymentHistoryItemResponse {
    private String paymentId;
    private String orderId;
    private String status;
    private String currency;
    private Long amountInPaise;
    private LocalDateTime createdAt;
    private LocalDateTime verifiedAt;
}
