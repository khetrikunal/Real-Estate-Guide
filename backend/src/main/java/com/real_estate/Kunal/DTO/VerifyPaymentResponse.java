package com.real_estate.Kunal.DTO;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class VerifyPaymentResponse {
    private boolean success;
    private String razorpayPaymentId;
    private String message;
}
