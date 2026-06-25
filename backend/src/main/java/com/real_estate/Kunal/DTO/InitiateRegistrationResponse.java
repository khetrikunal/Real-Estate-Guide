package com.real_estate.Kunal.DTO;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class InitiateRegistrationResponse {
    private String registrationToken;
    private String razorpayOrderId;
    private int amountInPaise;
    private double amountInRupees;
    private String planType;
    private String razorpayKeyId;
    private boolean resumePayment;
}
