package com.real_estate.Kunal.DTO;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.Data;

@Data
public class LoginRequest {

    @NotBlank(message = "Email is required")
    @Pattern(
            regexp = "(?i)(sherry|[A-Z0-9._%+-]+@[A-Z0-9.-]+\\.[A-Z]{2,})",
            message = "Email must be valid"
    )
    private String email;

    @NotBlank(message = "Password is required")
    private String password;

    // Optional for the shared login; the account's stored role determines access.
    @Pattern(regexp = "SUPER_ADMIN|ADMIN|SUB_ADMIN|EMPLOYEE", message = "Role is invalid")
    private String role;

}
