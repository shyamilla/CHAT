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


    @MessageMapping("/chat.private")
public void sendPrivateMessage(@Payload ChatMessage message,
                               @Header("Authorization") String authHeader) {
    try {
        System.out.println("[WS] Private message received between users.");

        message.setTimestamp(Instant.now());
        chatService.saveMessage(message.getRoomId(), message.getSenderUsername(), message.getContent());

        // Assume roomId = generated unique id between two usernames (sorted)
        String receiver = message.getRoomId().replace(message.getSenderUsername(), "").replace("_", "");

        // Send only to receiver (using user destination prefix)
        messagingTemplate.convertAndSendToUser(receiver, "/queue/private", message);

        // Also send to sender for confirmation
        messagingTemplate.convertAndSendToUser(message.getSenderUsername(), "/queue/private", message);

        System.out.println("[WS] Sent private message to " + receiver);
    } catch (Exception e) {
        System.err.println("[WS] Error in private message: " + e.getMessage());
    }
}


    /**
     * Optionally, handle “user typing” or other events in the future.
     */
}
