package com.real_estate.Kunal.DTO;

import lombok.Data;
import java.util.List;

@Data
public class InitiateRegistrationRequest {
    @jakarta.validation.constraints.NotBlank
    @jakarta.validation.constraints.Size(max = 100)
    private String name;
    @jakarta.validation.constraints.NotBlank
    @jakarta.validation.constraints.Email
    @jakarta.validation.constraints.Size(max = 150)
    private String email;
    @jakarta.validation.constraints.NotBlank
    @jakarta.validation.constraints.Size(min = 12, max = 72)
    private String password;
    private String phone;

    /** ALL_LOCATIONS, LOCATION_BASED, or CUSTOM */
    @jakarta.validation.constraints.NotBlank
    @jakarta.validation.constraints.Pattern(regexp = "(?i)ALL_LOCATIONS|ALL|FULL|LOCATION_BASED|CUSTOM")
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
