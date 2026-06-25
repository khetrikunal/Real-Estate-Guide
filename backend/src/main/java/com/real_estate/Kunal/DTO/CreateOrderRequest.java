package com.real_estate.Kunal.DTO;

import lombok.Data;

@Data
public class CreateOrderRequest {
    /** Amount in paise (e.g. ₹200/month = 20000 paise) */
    private Long amountInPaise;
    private String currency;    // optional, defaults to INR
    /** location_based | full */
    private String planType;
    private String assignedCity;
    private String assignedState;
    private String assignedArea;
    private Double subscriptionRate;
}
