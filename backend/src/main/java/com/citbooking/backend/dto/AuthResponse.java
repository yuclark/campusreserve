package com.citbooking.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class AuthResponse {
    private String message;
    private Long id; // Make sure this exists!
    private String email;
    private String fullName;
    private String role;
    private String token;
}
