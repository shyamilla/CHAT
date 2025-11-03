package com.application.chat.config;

import jakarta.servlet.http.HttpServletResponse;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

@Configuration
public class SecurityConfig {

    private final JwtAuthFilter jwtAuthFilter;

    public SecurityConfig(JwtAuthFilter jwtAuthFilter) {
        this.jwtAuthFilter = jwtAuthFilter;
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        return http
                // 🔒 Stateless + Token-based
                .csrf(csrf -> csrf.disable())
                .cors(cors -> {}) // enable via CorsConfig if defined
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))

                // 🧩 Route rules
                .authorizeHttpRequests(auth -> auth
                        // Public endpoints
                        .requestMatchers("/auth/**", "/ws/**", "/app/**", "/topic/**").permitAll()
                        // Protected routes
                        .requestMatchers("/chats/**", "/messages/**", "/users/**").authenticated()
                        // Everything else
                        .anyRequest().authenticated()
                )

                // ⚠️ Custom 401 JSON response
                .exceptionHandling(ex -> ex.authenticationEntryPoint((req, res, authException) -> {
                    System.out.println("❌ Unauthorized Access: Invalid or Missing JWT");
                    res.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                    res.setContentType("application/json");
                    res.getWriter().write("{\"error\":\"Unauthorized - Please login again.\"}");
                }))

                // 🔑 Add JWT Filter
                .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class)
                .build();
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration config) throws Exception {
        return config.getAuthenticationManager();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }
}
