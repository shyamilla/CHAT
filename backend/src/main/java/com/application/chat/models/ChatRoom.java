package com.application.chat.models;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.util.ArrayList;
import java.util.List;

/**
 * Represents a chat group or room.
 * Stores usernames (not emails) for privacy and consistency.
 */
@Document(collection = "chat_rooms")
public class ChatRoom {

    @Id
    private String id;

    private String name; // Group name

    private List<String> admins = new ArrayList<>();  // usernames of admins
    private List<String> members = new ArrayList<>(); // usernames of all members

    public ChatRoom() {}

    public ChatRoom(String name, String adminUsername, List<String> members) {
        this.name = name;
        this.admins.add(adminUsername);
        this.members = new ArrayList<>(members);
    }

    // ===================== Getters / Setters =====================

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public List<String> getAdmins() {
        return admins;
    }

    public void setAdmins(List<String> admins) {
        this.admins = admins;
    }

    public List<String> getMembers() {
        return members;
    }

    public void setMembers(List<String> members) {
        this.members = members;
    }

    // ===================== Helper Methods =====================

    public boolean isAdmin(String username) {
        return admins != null && admins.contains(username);
    }

    public boolean isMember(String username) {
        return members != null && members.contains(username);
    }

    @Override
    public String toString() {
        return "ChatRoom{" +
                "id='" + id + '\'' +
                ", name='" + name + '\'' +
                ", admins=" + admins +
                ", members=" + members +
                '}';
    }
}
