package com.application.chat.models;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import java.time.Instant;

@JsonIgnoreProperties(ignoreUnknown = true)
@Document(collection = "chat_messages")
public class ChatMessage {

    @Id
    private String id;

    private String roomId;
    private String senderUsername;
    private String receiverUsername; // ✅ NEW FIELD for private chats
    private String content;
    private Instant timestamp;

    public ChatMessage() {}

    public ChatMessage(String roomId, String senderUsername, String receiverUsername,
                       String content, Instant timestamp) {
        this.roomId = roomId;
        this.senderUsername = senderUsername;
        this.receiverUsername = receiverUsername;
        this.content = content;
        this.timestamp = timestamp;
    }

    public ChatMessage(String roomId, String senderUsername, String content, Instant timestamp) {
        this(roomId, senderUsername, null, content, timestamp);
    }

    // ===================== Getters / Setters =====================
    public String getId() { return id; }

    public String getRoomId() { return roomId; }
    public void setRoomId(String roomId) { this.roomId = roomId; }

    public String getSenderUsername() { return senderUsername; }
    public void setSenderUsername(String senderUsername) { this.senderUsername = senderUsername; }

    public String getReceiverUsername() { return receiverUsername; }
    public void setReceiverUsername(String receiverUsername) { this.receiverUsername = receiverUsername; }

    public String getContent() { return content; }
    public void setContent(String content) { this.content = content; }

    public Instant getTimestamp() { return timestamp; }
    public void setTimestamp(Instant timestamp) { this.timestamp = timestamp; }
}
