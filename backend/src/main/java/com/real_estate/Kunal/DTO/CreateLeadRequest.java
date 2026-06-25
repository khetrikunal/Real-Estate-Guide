package com.real_estate.Kunal.DTO;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class CreateLeadRequest {

    @NotBlank(message = "Customer name is required")
    private String customerName;

    @NotBlank(message = "Phone is required")
    private String phone;

    @Email(message = "Email should be valid")
    private String email;

    private String propertyInterest;

    private Long projectId;
    private Long configId;

    private String city;

}
