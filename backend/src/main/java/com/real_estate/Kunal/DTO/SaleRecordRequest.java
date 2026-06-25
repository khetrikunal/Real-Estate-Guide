package com.real_estate.Kunal.DTO;

import lombok.Data;

@Data
public class SaleRecordRequest {
    private Long projectId;
    private String buyerName;
    private String buyerPhone;
    private String buyerEmail;
    private Double amount;
    private Long unitId;
    private String notes;
}
