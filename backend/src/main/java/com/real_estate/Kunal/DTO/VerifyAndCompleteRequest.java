package com.real_estate.Kunal.DTO;

import lombok.Data;

@Data
public class VerifyAndCompleteRequest {
    private String registrationToken;
    private String razorpayPaymentId;
    private String razorpayOrderId;
    private String razorpaySignature;
}
