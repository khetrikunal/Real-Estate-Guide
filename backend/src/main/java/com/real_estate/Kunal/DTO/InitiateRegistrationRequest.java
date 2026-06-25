package com.real_estate.Kunal.DTO;

import lombok.Data;
import java.util.List;

@Data
public class InitiateRegistrationRequest {
    private String name;
    private String email;
    private String password;
    private String phone;

    /** ALL_LOCATIONS, LOCATION_BASED, or CUSTOM */
    private String planType;

    /** Required for LOCATION_BASED/CUSTOM when choosing multiple backend locations */
    private List<Long> locationIds;

    /** Legacy single-location fallback for older clients */
    private String state;
    private String city;
    private String area;

    private String profilePhotoUrl;
    private String aadhaarNumber;
    private String aadhaarCardUrl;
    private String panNumber;
}
