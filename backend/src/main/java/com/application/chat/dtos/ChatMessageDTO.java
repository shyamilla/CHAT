package com.application.chat.dtos;

public class ChatMessageDTO {
    private String roomId;
    private String senderEmail;
    private String content;

    public String getRoomId() { return roomId; }
    public void setRoomId(String roomId) { this.roomId = roomId; }
    public String getSenderEmail() { return senderEmail; }
    public void setSenderEmail(String senderEmail) { this.senderEmail = senderEmail; }
    public String getContent() { return content; }
    public void setContent(String content) { this.content = content; }
}
