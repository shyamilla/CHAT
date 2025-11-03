package com.application.chat.controllers;

import com.application.chat.models.User;
import com.application.chat.repositories.UserRepository;
import com.application.chat.services.UserService;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.ResponseEntity;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/users")
public class UserController {

    private final UserService userService;
    private final UserRepository userRepository;

    public UserController(UserService userService, UserRepository userRepository) {
        this.userService = userService;
        this.userRepository = userRepository;
    }

    // ✅ Get all users (for search or group creation)
    @GetMapping
    public ResponseEntity<List<User>> getAllUsers() {
        List<User> users = userService.getAllUsers();
        return ResponseEntity.ok(users);
    }

    // ✅ Get user by ID
    @GetMapping("/{id}")
    public ResponseEntity<User> getUserById(@PathVariable String id) {
        User user = userService.getUserById(id);
        return ResponseEntity.ok(user);
    }

    // ✅ Search users by username (case-insensitive partial match)
    @GetMapping("/search")
    public ResponseEntity<List<User>> searchUsers(@RequestParam String query) {
        List<User> users = userService.getAllUsers().stream()
                .filter(u -> u.getUsername().toLowerCase().contains(query.toLowerCase()))
                .toList();
        return ResponseEntity.ok(users);
    }

    // ✅ Get username by email (used by frontend to resolve display name)
    @GetMapping("/by-email")
    public ResponseEntity<Map<String, String>> getUsernameByEmail(@RequestParam String email) {
        return userRepository.findByEmail(email)
                .map(user -> ResponseEntity.ok(Map.of("username", user.getUsername())))
                .orElse(ResponseEntity.notFound().build());
    }
}
