package com.application.chat.controllers;

import com.application.chat.dtos.ChatMessageDTO;
import com.application.chat.models.ChatMessage;
import com.application.chat.models.ChatRoom;
import com.application.chat.services.ChatService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/messages")

public class MessageController {

    private final ChatService chatService;

    public MessageController(ChatService chatService) {
        this.chatService = chatService;
    }

    // ✅ Send message
    @PostMapping("/send")
    public ResponseEntity<ChatMessage> sendMessage(@RequestBody ChatMessageDTO dto) {
        ChatMessage saved = chatService.saveMessage(dto.getRoomId(), dto.getSenderEmail(), dto.getContent());
        return ResponseEntity.ok(saved);
    }

    // ✅ Fetch messages
    @GetMapping("/{roomId}")
    public ResponseEntity<List<ChatMessage>> getMessages(@PathVariable String roomId) {
        return ResponseEntity.ok(chatService.getMessages(roomId));
    }

    // ✅ NEW: Get or create private chat messages between two users
    @GetMapping("/private/{userA}/{userB}")
    public ResponseEntity<List<ChatMessage>> getPrivateMessages(
            @PathVariable String userA,
            @PathVariable String userB) {

        ChatRoom room = chatService.getOrCreatePrivateChat(userA, userB); // returns ChatRoom
        List<ChatMessage> messages = chatService.getMessages(room.getId()); // use room.getId()

        return ResponseEntity.ok(messages);
    }

}
