package com.application.chat.dtos;

public class ChatMessageDTO {
    private String roomId;             // For group chat (can be null for private)
    private String senderUsername;     // Sender's username
    private String receiverUsername;   // Receiver's username (null for group)
    private String content;            // Message text

    public String getRoomId() {
        return roomId;
    }

    public void setRoomId(String roomId) {
        this.roomId = roomId;
    }

    public String getSenderUsername() {
        return senderUsername;
    }

    public void setSenderUsername(String senderUsername) {
        this.senderUsername = senderUsername;
    }

    public String getReceiverUsername() {
        return receiverUsername;
    }

    public void setReceiverUsername(String receiverUsername) {
        this.receiverUsername = receiverUsername;
    }

    public String getContent() {
        return content;
    }

    public void setContent(String content) {
        this.content = content;
    }
}
