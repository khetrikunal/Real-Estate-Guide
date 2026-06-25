package com.real_estate.Kunal.DTO;

import lombok.Data;

import java.util.List;

@Data
public class SubscribeRequest {

    private Long userId;

    private String planType; // ALL or CUSTOM

    private Double price;

    private List<Long> locationIds; // only for CUSTOM plan

}
