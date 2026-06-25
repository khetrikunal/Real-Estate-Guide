package com.real_estate.Kunal.DTO;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class RegisterRequest {

    @NotBlank(message = "Name is required")
    @Size(max = 120, message = "Name is too long")
    private String name;

    @NotBlank(message = "Email is required")
    @Email(message = "Email must be valid")
    private String email;

    @NotBlank(message = "Password is required")
    @Size(min = 12, message = "Password must be at least 12 characters")
    private String password;

    @NotBlank(message = "Role is required")
    @Pattern(regexp = "SUPER_ADMIN|ADMIN|SUB_ADMIN|EMPLOYEE", message = "Role is invalid")
    private String role;

    private String razorpayPaymentId;

    private String profilePhotoUrl;
    private String aadhaarNumber;
    private String aadhaarCardUrl;
    private String panNumber;

}
