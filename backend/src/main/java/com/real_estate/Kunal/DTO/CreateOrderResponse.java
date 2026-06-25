package com.real_estate.Kunal.DTO;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class CreateOrderResponse {
    private String orderId;
    private Long amountInPaise;
    private String currency;
    private String keyId;
}
