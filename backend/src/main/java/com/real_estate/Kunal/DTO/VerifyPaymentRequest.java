package com.real_estate.Kunal.DTO;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class VerifyPaymentRequest {
    @NotBlank(message = "razorpayPaymentId is required")
    private String razorpayPaymentId;
    @NotBlank(message = "razorpayOrderId is required")
    private String razorpayOrderId;
    @NotBlank(message = "razorpaySignature is required")
    private String razorpaySignature;
}
