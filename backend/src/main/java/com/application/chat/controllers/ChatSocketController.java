package com.application.chat.controllers;

import com.application.chat.models.ChatMessage;
import com.application.chat.services.ChatService;
import org.springframework.messaging.handler.annotation.*;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

import java.time.Instant;

@Controller
public class ChatSocketController {

    private final SimpMessagingTemplate messagingTemplate;
    private final ChatService chatService;

    public ChatSocketController(SimpMessagingTemplate messagingTemplate, ChatService chatService) {
        this.messagingTemplate = messagingTemplate;
        this.chatService = chatService;
    }

    /**
     * Receives messages from clients via STOMP and broadcasts to group topic
     */
    @MessageMapping("/chat.sendMessage")
    public void sendMessage(@Payload ChatMessage message,
                            @Header("Authorization") String authHeader) {
        try {
            System.out.println("[WS] Message received for room: " + message.getRoomId());

            // Ensure sender is authenticated via JWT header (already verified by WebSocketConfig)
            message.setTimestamp(Instant.now());

            // Persist message in MongoDB
            chatService.saveMessage(message.getRoomId(), message.getSenderUsername(), message.getContent());

            // Broadcast to all group members
            messagingTemplate.convertAndSend("/topic/group/" + message.getRoomId(), message);
            System.out.println("[WS] Broadcasted message to group " + message.getRoomId());
        } catch (Exception e) {
            System.err.println("[WS] Error processing message: " + e.getMessage());
        }
    }

    /**
     * Optionally, handle “user typing” or other events in the future.
     */
}
