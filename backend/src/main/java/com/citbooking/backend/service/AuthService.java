package com.citbooking.backend.service;

import com.citbooking.backend.dto.*;
import com.citbooking.backend.model.User;
import com.citbooking.backend.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.Optional;

@Service
public class AuthService {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private BCryptPasswordEncoder passwordEncoder;

    public ResponseEntity<?> registerUser(RegisterRequest request) {
        try {
            if (!request.getEmail().matches("^[a-z]+\\.[a-z]+@cit\\.edu$")) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                        .body("Email must be in format: firstname.lastname@cit.edu");
            }

            if (!request.getStudentId().matches("^\\d{2}-\\d{4}-\\d{3}$")) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                        .body("Student ID must be in format: 12-3456-789");
            }

            if (userRepository.existsByEmail(request.getEmail())) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                        .body("Email already registered");
            }

            if (userRepository.existsByStudentId(request.getStudentId())) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                        .body("Student ID already registered");
            }

            if (request.getAge() < 16 || request.getAge() > 100) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                        .body("Age must be between 16 and 100");
            }

            User user = new User();
            user.setEmail(request.getEmail());
            user.setPassword(passwordEncoder.encode(request.getPassword())); // hashed
            user.setFullName(request.getFullName());
            user.setStudentId(request.getStudentId());
            user.setAddress(request.getAddress());
            user.setAge(request.getAge());
            user.setRole("STUDENT");
            user.setSupabaseId(null); // no longer using Supabase

            userRepository.save(user);

            return ResponseEntity.ok(new AuthResponse(
                    "Registration successful",
                    user.getId(),
                    user.getEmail(),
                    user.getFullName(),
                    user.getRole(),
                    "token-" + user.getId()));

        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Registration failed: " + e.getMessage());
        }
    }

    public ResponseEntity<?> loginUser(LoginRequest request) {
        try {
            User user = userRepository.findByEmail(request.getEmail())
                    .orElse(null);

            if (user == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body("Invalid email or password");
            }

            // BCrypt comparison
            if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body("Invalid email or password");
            }

            return ResponseEntity.ok(new AuthResponse(
                    "Login successful",
                    user.getId(),
                    user.getEmail(),
                    user.getFullName(),
                    user.getRole(),
                    "token-" + user.getId()));

        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Login failed: " + e.getMessage());
        }
    }

    public ResponseEntity<?> updatePassword(Map<String, String> request) {
        try {
            String email = request.get("email");
            String newPassword = request.get("password");

            if (email == null || newPassword == null) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                        .body("Email and password are required");
            }

            Optional<User> userOptional = userRepository.findByEmail(email);

            if (userOptional.isEmpty()) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body("User not found");
            }

            User user = userOptional.get();
            user.setPassword(passwordEncoder.encode(newPassword)); // hashed
            userRepository.save(user);

            return ResponseEntity.ok("Password updated successfully");

        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Failed to update password: " + e.getMessage());
        }
    }
}