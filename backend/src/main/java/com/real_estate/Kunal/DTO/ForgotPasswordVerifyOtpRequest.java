package com.real_estate.Kunal.DTO;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.Data;

@Data
public class ForgotPasswordVerifyOtpRequest {
    @NotBlank(message = "Email is required")
    @Email(message = "Email must be valid")
    private String email;

    @NotBlank(message = "OTP is required")
    @Pattern(regexp = "\\d{4,8}", message = "OTP format is invalid")
    private String otp;
}
