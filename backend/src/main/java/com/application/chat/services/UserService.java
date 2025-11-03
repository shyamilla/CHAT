package com.application.chat.services;

import com.application.chat.models.User;
import com.application.chat.repositories.UserRepository;
import org.springframework.security.core.userdetails.*;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.util.*;

@Service
public class UserService implements UserDetailsService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    // In-memory OTP storage: email -> OTP
    private final Map<String, String> otpStore = new HashMap<>();

    private final SecureRandom secureRandom = new SecureRandom();

    public UserService(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    // ========================= REGISTER =========================
    @Transactional
    public User registerUser(User user) {
        Objects.requireNonNull(user, "User cannot be null");
        user.setPassword(passwordEncoder.encode(user.getPassword()));
        return userRepository.save(user);
    }

    // ========================= FINDERS =========================

    // ✅ Find user by username (used for reference)
    public Optional<User> findByUsername(String username) {
        return userRepository.findByUsername(username); 
        // The method findByUsername(String) is undefined for the type UserRepositoryJava(67108964)

    }

    // ✅ Find user by email (for login and group creation)
    public Optional<User> findByEmail(String email) {
        return userRepository.findByEmail(email);
    }

    // ✅ Fetch user by ID
    public User getUserById(String userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found with ID: " + userId));
    }

    // ✅ List all users
    public List<User> getAllUsers() {
        return userRepository.findAll();
    }

    // ========================= SPRING SECURITY =========================
    @Override
    public UserDetails loadUserByUsername(String email) throws UsernameNotFoundException {
        // Login using email
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new UsernameNotFoundException("User not found with email: " + email));

        return new org.springframework.security.core.userdetails.User(
                user.getEmail(),
                user.getPassword(),
                Collections.emptyList() // No roles/authorities
        );
    }

    // ========================= OTP / RESET PASSWORD =========================

    // ✅ Generate OTP
    public String generateOtp(String email) {
        userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Email not found"));

        int otpInt = 100000 + secureRandom.nextInt(900000); // 6-digit OTP
        String otp = String.valueOf(otpInt);
        otpStore.put(email, otp);
        return otp;
    }

    // ✅ Reset password using OTP
    public void resetPasswordWithOtp(String email, String otp, String newPassword) {
        String storedOtp = otpStore.get(email);

        if (storedOtp == null || !storedOtp.equals(otp)) {
            throw new RuntimeException("Invalid OTP");
        }

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));

        user.setPassword(passwordEncoder.encode(newPassword));
        userRepository.save(user);
        otpStore.remove(email);
    }
}
