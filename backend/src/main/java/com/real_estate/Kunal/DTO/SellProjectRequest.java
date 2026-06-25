package com.real_estate.Kunal.DTO;

import jakarta.validation.constraints.Min;
import lombok.Data;

@Data
public class SellProjectRequest {

    private Long configurationId;  // specific config to sell from

    private Long unitId;

    @Min(1)
    private Integer unitsSold;

    private String buyerName;

    private String buyerPhone;

    private String buyerEmail;

    private Double amount;

    private String notes;
}
