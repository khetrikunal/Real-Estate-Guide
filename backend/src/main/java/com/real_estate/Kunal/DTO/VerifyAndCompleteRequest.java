package com.real_estate.Kunal.DTO;

import lombok.Data;

@Data
public class VerifyAndCompleteRequest {
    @jakarta.validation.constraints.NotBlank
    private String registrationToken;
    @jakarta.validation.constraints.NotBlank
    private String razorpayPaymentId;
    @jakarta.validation.constraints.NotBlank
    private String razorpayOrderId;
    @jakarta.validation.constraints.NotBlank
    private String razorpaySignature;
}
