package com.application.chat.dtos;


public class LoginDTO {
    private String email;
    private String password;

    public LoginDTO() {}

    public LoginDTO(String username, String password) {
        this.email = username;
        this.password = password;
    }

    public String getEmail() { return email; }
    public void setEmail(String username) { this.email = username; }

    public String getPassword() { return password; }
    public void setPassword(String password) { this.password = password; }
}
 