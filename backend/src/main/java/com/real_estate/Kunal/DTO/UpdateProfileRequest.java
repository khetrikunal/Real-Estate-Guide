package com.real_estate.Kunal.DTO;

import lombok.Data;

@Data
public class UpdateProfileRequest {
    private String name;
    private String phone;
    private String profilePhotoUrl;
}
