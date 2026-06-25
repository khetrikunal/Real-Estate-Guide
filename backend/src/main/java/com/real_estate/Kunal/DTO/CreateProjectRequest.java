package com.real_estate.Kunal.DTO;

import lombok.Data;

@Data
public class CreateProjectRequest {

    private String projectName;
    private String propertyType;
    private String listingType;
    private String configuration;
    private int completionPercentage;
    private int totalUnits;
    private double price;
    private String address;
    private double latitude;
    private double longitude;

}