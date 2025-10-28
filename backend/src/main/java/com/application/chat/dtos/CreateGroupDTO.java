package com.application.chat.dtos;

import java.util.List;

/**
 * DTO for creating a new chat group using usernames (not emails).
 */
public class CreateGroupDTO {

    private String name;               // Group name
    private String creatorUsername;    // Creator's username
    private List<String> memberUsernames; // Usernames of members to add

    public CreateGroupDTO() {}

    public CreateGroupDTO(String name, String creatorUsername, List<String> memberUsernames) {
        this.name = name;
        this.creatorUsername = creatorUsername;
        this.memberUsernames = memberUsernames;
    }

    // ======= Getters & Setters =======

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getCreatorUsername() {
        return creatorUsername;
    }

    public void setCreatorUsername(String creatorUsername) {
        this.creatorUsername = creatorUsername;
    }

    public List<String> getMemberUsernames() {
        return memberUsernames;
    }

    public void setMemberUsernames(List<String> memberUsernames) {
        this.memberUsernames = memberUsernames;
    }
}
