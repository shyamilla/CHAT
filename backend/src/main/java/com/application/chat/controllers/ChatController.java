package com.application.chat.controllers;

import com.application.chat.dtos.CreateGroupDTO;
import com.application.chat.dtos.ModifyGroupDTO;
import com.application.chat.models.ChatMessage;
import com.application.chat.models.ChatRoom;
import com.application.chat.services.ChatService;
import com.application.chat.config.JwtUtils;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.List;
import java.util.Map;

/**
 * 💬 ChatController — REST endpoints for chat management
 * - Group chat creation and membership
 * - Private (1:1) chats
 * - Common chat operations (rooms, messages)
 */
@RestController
@RequestMapping("/chats")
public class ChatController {

    private final ChatService chatService;
    private final JwtUtils jwtUtils;
    private final SimpMessagingTemplate messagingTemplate;

    public ChatController(ChatService chatService,
                          JwtUtils jwtUtils,
                          SimpMessagingTemplate messagingTemplate) {
        this.chatService = chatService;
        this.jwtUtils = jwtUtils;
        this.messagingTemplate = messagingTemplate;
    }

    /* ==========================================================
       🧩 GROUP CHAT ENDPOINTS
       ========================================================== */

    /** ✅ Create a new group chat. */
    @PostMapping("/group/create")
    public ResponseEntity<ChatRoom> createGroup(
            @RequestBody CreateGroupDTO dto,
            @RequestHeader("Authorization") String authHeader) {

        String token = authHeader.replace("Bearer ", "");
        String creatorUsername = jwtUtils.extractUsername(token);

        ChatRoom group = chatService.createGroup(dto.getName(), creatorUsername, dto.getMemberUsernames());
        return ResponseEntity.ok(group);
    }

    /** ✅ Add members to a group. */
    @PostMapping("/group/{id}/add")
    public ResponseEntity<ChatRoom> addMembers(@PathVariable String id,
                                               @RequestBody ModifyGroupDTO dto) {
        return ResponseEntity.ok(chatService.addMembers(id, dto.getMemberUsernames()));
    }

    /** ✅ Remove a member (admin only). */
    @PostMapping("/group/{id}/remove")
    public ResponseEntity<ChatRoom> removeMember(@PathVariable String id,
                                                 @RequestParam String adminUsername,
                                                 @RequestParam String memberToRemove) {
        return ResponseEntity.ok(chatService.removeMember(id, adminUsername, memberToRemove));
    }

    /** ✅ Get group details. */
    @GetMapping("/group/details/{groupId}")
    public ResponseEntity<?> getGroupDetails(@PathVariable String groupId) {
        try {
            return ResponseEntity.ok(chatService.getGroupById(groupId));
        } catch (RuntimeException e) {
            return ResponseEntity.status(404).body("Group not found");
        }
    }

    /** ✅ Assign new admin in a group. */
    @PostMapping("/group/{groupId}/assign-admin")
    public ResponseEntity<?> assignAdmin(@PathVariable String groupId,
                                         @RequestParam String adminUsername,
                                         @RequestParam String newAdminUsername) {
        try {
            return ResponseEntity.ok(chatService.assignAdmin(groupId, adminUsername, newAdminUsername));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }


    /* ==========================================================
       💬 PRIVATE CHAT ENDPOINTS (One-to-One)
       ========================================================== */

    /** ✅ Create or fetch a private chat between two users. */
    @PostMapping("/private/{receiverUsername}") 
    public ResponseEntity<ChatRoom> getOrCreatePrivateChat(
            @PathVariable String receiverUsername,
            @RequestHeader("Authorization") String authHeader) {

        String token = authHeader.replace("Bearer ", "");
        String senderUsername = jwtUtils.extractUsername(token);

        ChatRoom room = chatService.createPrivateChat(senderUsername, receiverUsername);
        return ResponseEntity.ok(room);
    }

    /** ✅ Get details of a private chat with another user. */
    @GetMapping("/private/details/{username}")
    public ResponseEntity<?> getPrivateChatDetails(@PathVariable String username,
                                                   @RequestHeader("Authorization") String authHeader) {
        String token = authHeader.replace("Bearer ", "");
        String requester = jwtUtils.extractUsername(token);

        try {
            ChatRoom privateRoom = chatService.createPrivateChat(requester, username);
            return ResponseEntity.ok(privateRoom);
        } catch (RuntimeException e) {
            return ResponseEntity.status(404).body("Private chat not found");
        }
    }

    /** ✅ List all private chats for a user. */
    @GetMapping("/private/list/{username}")
    public ResponseEntity<List<Map<String, Object>>> getPrivateChatsForUser(@PathVariable String username) {
        return ResponseEntity.ok(chatService.getPrivateChatsForUser(username));
    }


    /* ==========================================================
       🧭 COMMON ENDPOINTS (Shared Between Group & Private)
       ========================================================== */

    /** ✅ Get all chat rooms (private + group) for a user. */
    @GetMapping("/rooms/{username}")
    public ResponseEntity<List<Map<String, Object>>> getUserChatRooms(@PathVariable String username) {
        return ResponseEntity.ok(chatService.getAllUserChatRooms(username));
    }

    /** ✅ Get all messages for a specific room. */
    @GetMapping("/{roomId}/messages")
    public ResponseEntity<List<ChatMessage>> getMessages(@PathVariable String roomId) {
        return ResponseEntity.ok(chatService.getMessages(roomId));
    }

    /** ✅ Send a message (REST fallback). Usually used if WS fails. */
     @PostMapping("/messages/send")
    public ResponseEntity<?> sendMessage(@RequestBody Map<String, String> body,
                                         @RequestHeader("Authorization") String authHeader) {

        String token = authHeader.replace("Bearer ", "");
        String senderUsername = jwtUtils.extractUsername(token);

        String roomId = body.get("roomId");
        String content = body.get("content");
        String receiverUsername = body.get("receiverUsername");

        // 🧠 For private chat without roomId, find or create one
        if ((roomId == null || roomId.isEmpty()) && receiverUsername != null && !receiverUsername.isEmpty()) {
            ChatRoom privateRoom = chatService.createPrivateChat(senderUsername, receiverUsername);
            roomId = privateRoom.getId();
        }

        // 📨 Create and save message
        ChatMessage msg = new ChatMessage();
        msg.setRoomId(roomId);
        msg.setSenderUsername(senderUsername);
        msg.setReceiverUsername(receiverUsername);
        msg.setContent(content);
        msg.setTimestamp(Instant.now());

        ChatMessage saved = chatService.saveMessage(msg);

        // 🧭 Notify via WebSocket as well (optional)
        messagingTemplate.convertAndSend("/topic/messages/" + roomId, saved);

        return ResponseEntity.ok(saved);
    }

    /** ✅ Get details of any chat room (private or group). */
@GetMapping("/room/{roomId}")
public ResponseEntity<?> getRoomById(@PathVariable String roomId) {
    try {
        ChatRoom room = chatService.getRoomById(roomId);
        return ResponseEntity.ok(room);
    } catch (RuntimeException e) {
        return ResponseEntity.status(404).body(Map.of("error", e.getMessage()));
    }
}

}
