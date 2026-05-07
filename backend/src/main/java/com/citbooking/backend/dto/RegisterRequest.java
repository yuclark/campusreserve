package com.citbooking.backend.dto;

import lombok.Data;

@Data
public class RegisterRequest {
    private String email;
    private String password;
    private String fullName;
    private String studentId;
    private String address;
    private Integer age;
    private String supabaseId;
}
