package com.application.chat.controllers;

import com.application.chat.dtos.*;
import com.application.chat.models.User;
import com.application.chat.services.UserService;
import com.application.chat.config.JwtUtils;

import java.util.*;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.security.authentication.*;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.AuthenticationException;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/auth")

public class AuthController {

    private final AuthenticationManager authenticationManager;
    private final UserService userService;
    private final JwtUtils jwtUtils;
    private final JavaMailSender mailSender;

    @Autowired
    public AuthController(AuthenticationManager authenticationManager,
                          UserService userService,
                          JwtUtils jwtUtils,
                          JavaMailSender mailSender) {
        this.authenticationManager = authenticationManager;
        this.userService = userService;
        this.jwtUtils = jwtUtils;
        this.mailSender = mailSender;
    }

    // ==================== REGISTER ====================
    @PostMapping("/register")
    public ResponseEntity<Map<String, Object>> register(@RequestBody UserDTO dto) {
        Map<String, Object> response = new HashMap<>();
        try {
            User user = new User(dto.getUsername(), dto.getEmail(), dto.getPassword());
            User saved = userService.registerUser(user);
            saved.setPassword(null); // hide password

            response.put("message", "Registration successful");
            response.put("user", saved);
            return ResponseEntity.ok(response);

        } catch (RuntimeException e) {
            response.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(response);
        }
    }

    // ==================== LOGIN ====================
    @PostMapping("/login")
public ResponseEntity<Map<String, Object>> login(@RequestBody LoginDTO dto) {
    Map<String, Object> response = new HashMap<>();
    try {
        Authentication auth = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(dto.getEmail(), dto.getPassword()));

        // ✅ Fetch full user
        User user = userService.findByEmail(dto.getEmail())
                .orElseThrow(() -> new RuntimeException("User not found"));

        // ✅ Generate JWT token using email
        String token = jwtUtils.generateJwtToken(dto.getEmail());
        // String token = jwtUtils.generateJwtToken(user.getUsername());

        response.put("token", token);
        response.put("username", user.getUsername()); 
        response.put("email", user.getEmail());
        response.put("message", "Login successful");

        return ResponseEntity.ok(response);

    } catch (AuthenticationException e) {
        response.put("error", "Invalid email or password");
        return ResponseEntity.status(401).body(response);
    }
}


    // ==================== FORGOT PASSWORD ====================
    @PostMapping("/forgot")
    public ResponseEntity<Map<String, String>> forgotPassword(@RequestBody ForgotPasswordDTO dto) {
        Map<String, String> response = new HashMap<>();
        try {
            // Generate OTP via service
            String otp = userService.generateOtp(dto.getEmail());

            // Send OTP email
            sendOtpEmail(dto.getEmail(), otp);
            System.out.println("[AuthController] OTP generated for " + dto.getEmail() + ": " + otp);

            response.put("message", "OTP sent to email");
            // ⚠️ for dev only — remove before production
            response.put("otp", otp);

            return ResponseEntity.ok(response);

        } catch (RuntimeException e) {
            response.put("error", e.getMessage());
            return ResponseEntity.status(404).body(response);
        } catch (Exception e) {
            response.put("error", "Failed to send OTP email: " + e.getMessage());
            return ResponseEntity.internalServerError().body(response);
        }
    }

    // ==================== RESET PASSWORD ====================
    @PostMapping("/reset")
    public ResponseEntity<Map<String, String>> resetPassword(@RequestBody ResetPasswordDTO dto) {
        Map<String, String> response = new HashMap<>();
        try {
            userService.resetPasswordWithOtp(dto.getEmail(), dto.getOtp(), dto.getNewPassword());
            response.put("message", "Password reset successful");
            System.out.println("[AuthController] Password reset successful for " + dto.getEmail());
            return ResponseEntity.ok(response);

        } catch (RuntimeException e) {
            response.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(response);
        }
    }

    // ==================== UTILITY: SEND OTP EMAIL ====================
    private void sendOtpEmail(String email, String otp) {
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setTo(email);
            message.setSubject("Password Reset OTP");
            message.setText("Your OTP for password reset is: " + otp + "\n\nThis OTP is valid for 10 minutes.");

            mailSender.send(message);
            System.out.println("[AuthController] OTP email sent successfully to " + email);
        } catch (Exception e) {
            System.err.println("[AuthController] Failed to send OTP email: " + e.getMessage());
            throw new RuntimeException("Unable to send OTP email");
        }
    }
}
