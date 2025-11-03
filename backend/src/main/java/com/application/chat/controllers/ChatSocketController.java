package com.application.chat.controllers;

import com.application.chat.models.ChatMessage;
import com.application.chat.models.ChatRoom;
import com.application.chat.services.ChatService;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.stereotype.Controller;
import org.springframework.messaging.simp.SimpMessagingTemplate;

import java.time.Instant;

@Controller
public class ChatSocketController {

    private final ChatService chatService;
    private final SimpMessagingTemplate messagingTemplate;

    public ChatSocketController(ChatService chatService, SimpMessagingTemplate messagingTemplate) {
        this.chatService = chatService;
        this.messagingTemplate = messagingTemplate;
    }

    /**
     * Handles incoming WebSocket messages for private and group chats.
     */
    @MessageMapping("/send-message")
    public void handleIncomingMessage(@Payload ChatMessage message) {
        try {
            message.setTimestamp(Instant.now());

            // ✅ 1. Ensure private chat always has a valid roomId
            if ((message.getRoomId() == null || message.getRoomId().isEmpty())
                    && message.getReceiverUsername() != null
                    && !message.getReceiverUsername().isEmpty()) {

                ChatRoom privateRoom = chatService.createPrivateChat(
                        message.getSenderUsername(),
                        message.getReceiverUsername()
                );
                message.setRoomId(privateRoom.getId());
            }

            // ✅ 2. Save message in DB
            ChatMessage savedMessage = chatService.saveMessage(message);

            String roomId = savedMessage.getRoomId();
            String sender = savedMessage.getSenderUsername();
            String receiver = savedMessage.getReceiverUsername();

            System.out.println("💬 WS message saved for room: " + roomId + 
                               " | sender: " + sender + " | receiver: " + receiver);

            // ✅ 3. Broadcast message to all room subscribers (sender + receiver)
            messagingTemplate.convertAndSend("/topic/messages/" + roomId, savedMessage);

            // ✅ 4. Send private copies (optional, helps ensure sender/receiver both update UI)
            if (receiver != null && !receiver.isEmpty()) {
                messagingTemplate.convertAndSendToUser(receiver, "/queue/private", savedMessage);
            }
            messagingTemplate.convertAndSendToUser(sender, "/queue/private", savedMessage);

        } catch (Exception e) {
            System.err.println("❌ Error handling WebSocket message: " + e.getMessage());
            e.printStackTrace();
        }
    }
}
