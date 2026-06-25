package com.real_estate.Kunal.DTO;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class RegistrationStatusResponse {
    private String status;

    /** JWT token — only present when status == COMPLETED */
    private String token;

    private Long userId;
    private String name;
    private String email;
    private String role;

    /** Firebase custom token if available */
    private String firebaseToken;
}
