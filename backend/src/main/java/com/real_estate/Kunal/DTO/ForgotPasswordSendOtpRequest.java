package com.real_estate.Kunal.DTO;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class ForgotPasswordSendOtpRequest {
    @NotBlank(message = "Email is required")
    @Email(message = "Email must be valid")
    private String email;
}
