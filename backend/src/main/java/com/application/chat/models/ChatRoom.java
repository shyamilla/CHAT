package com.application.chat.models;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.mapping.Document;
import java.util.ArrayList;
import java.util.List;

@Document(collection = "chat_rooms")
// ✅ Make sure private chats are unique by pairKey
@CompoundIndex(name = "unique_pairKey", def = "{'pairKey': 1}", unique = true, sparse = true)
public class ChatRoom {

    @Id
    private String id;

    private String name; 
    private boolean isPrivate;
    private boolean isGroup;
    private List<String> admins = new ArrayList<>();
    private List<String> members = new ArrayList<>();

    // ✅ Added field
    private String pairKey; // unique for private chats (e.g., "alice-bob")

    public ChatRoom() {}

    public ChatRoom(String name, boolean isPrivate, boolean isGroup, String adminUsername, List<String> members) {
        this.name = name;
        this.isPrivate = isPrivate;
        this.isGroup = isGroup;
        if (adminUsername != null) this.admins.add(adminUsername);
        this.members = new ArrayList<>(members);
    }

    // ===== Getters & Setters =====
    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public boolean isPrivate() { return isPrivate; }
    public void setPrivate(boolean aPrivate) { isPrivate = aPrivate; }

    public boolean isGroup() { return isGroup; }
    public void setGroup(boolean group) { isGroup = group; }

    public List<String> getAdmins() { return admins; }
    public void setAdmins(List<String> admins) { this.admins = admins; }

    public List<String> getMembers() { return members; }
    public void setMembers(List<String> members) { this.members = members; }

    public String getPairKey() { return pairKey; }
    public void setPairKey(String pairKey) { this.pairKey = pairKey; }

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
                ", isPrivate=" + isPrivate +
                ", isGroup=" + isGroup +
                ", pairKey='" + pairKey + '\'' +
                ", admins=" + admins +
                ", members=" + members +
                '}';
    }
}
