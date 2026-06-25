package com.real_estate.Kunal.DTO;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
@AllArgsConstructor
public class LoginResponse {
    private String token;
    private String firebaseToken;
    private String role;
    private Long userId;
    private String name;
    private String email;
}
