package com.application.chat.controllers;

import com.application.chat.dtos.ChatMessageDTO;
import com.application.chat.models.ChatMessage;
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
}
