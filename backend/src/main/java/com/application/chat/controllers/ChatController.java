package com.application.chat.controllers;

import com.application.chat.dtos.CreateGroupDTO;
import com.application.chat.dtos.ModifyGroupDTO;
import com.application.chat.models.ChatRoom;
import com.application.chat.services.ChatService;
import com.application.chat.config.JwtUtils;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/chats")
public class ChatController {

    private final ChatService chatService;
    private final SimpMessagingTemplate messagingTemplate;
    private final JwtUtils jwtUtils;

    public ChatController(ChatService chatService, SimpMessagingTemplate messagingTemplate, JwtUtils jwtUtils) {
        this.chatService = chatService;
        this.messagingTemplate = messagingTemplate;
        this.jwtUtils = jwtUtils;
    }

    // ✅ CREATE GROUP (username extracted securely from JWT)
    @PostMapping("/create")
    public ResponseEntity<ChatRoom> createGroup(
            @RequestBody CreateGroupDTO dto,
            @RequestHeader("Authorization") String authHeader) {
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            System.err.println("❌ Missing or invalid Authorization header.");
            return ResponseEntity.status(401).build();
        }

        // 🔐 Extract username from JWT token
        String token = authHeader.substring(7);
        String creatorUsername = jwtUtils.extractUsername(token);
        // The method extractUsername(String) is undefined for the type
        // JwtUtilsJava(67108964)

        if (creatorUsername == null || creatorUsername.isBlank()) {
            System.err.println("❌ Invalid JWT: unable to extract username.");
            return ResponseEntity.status(401).build();
        }

        System.out.println("🟢 Creating new group: " + dto.getName() + " by " + creatorUsername);

        // ✅ Create group with creator automatically added as admin + member
        ChatRoom room = chatService.createGroup(dto.getName(), creatorUsername, dto.getMemberUsernames());

        // ✅ Notify all members + admins in real-time (via WebSocket)
        try {
            List<String> recipients = room.getMembers();
            recipients.addAll(room.getAdmins());

            recipients.stream().distinct().forEach(user -> {
                System.out.println("📢 Notifying user: " + user);
                messagingTemplate.convertAndSendToUser(
                        user,
                        "/topic/updates",
                        "GROUP_CREATED:" + room.getName());
            });
        } catch (Exception e) {
            System.err.println("⚠️ Failed to broadcast new group: " + e.getMessage());
        }

        return ResponseEntity.ok(room);
    }

    // ✅ FETCH ALL GROUPS THAT A USER BELONGS TO
    @GetMapping("/rooms/{username}")
    public ResponseEntity<List<ChatRoom>> getUserChatRooms(@PathVariable String username) {
        System.out.println("📨 Fetching chat rooms for user: " + username);
        List<ChatRoom> rooms = chatService.getAllUserChatRooms(username);
        return ResponseEntity.ok(rooms);
    }

    // ✅ ADD MEMBERS (admin only)
    @PostMapping("/add-members")
    public ResponseEntity<ChatRoom> addMembers(@RequestBody ModifyGroupDTO dto) {
        System.out.println("👥 Adding members to group: " + dto.getGroupId());
        ChatRoom updated = chatService.addMembers(dto.getGroupId(), dto.getMemberUsernames());
        return ResponseEntity.ok(updated);
    }

    // ✅ REMOVE MEMBER (admin only)
    @DeleteMapping("/{groupId}/remove-member")
    public ResponseEntity<ChatRoom> removeMember(
            @PathVariable String groupId,
            @RequestParam String adminUsername,
            @RequestParam String memberToRemove) {
        System.out.println("❌ Removing member " + memberToRemove + " by admin " + adminUsername);
        ChatRoom updated = chatService.removeMember(groupId, adminUsername, memberToRemove);
        return ResponseEntity.ok(updated);
    }

    // ✅ ASSIGN ADMIN ROLE (admin only)
    @PostMapping("/{groupId}/assign-admin")
    public ResponseEntity<ChatRoom> assignAdmin(
            @PathVariable String groupId,
            @RequestParam String adminUsername,
            @RequestParam String newAdminUsername) {
        System.out.println("⭐ " + adminUsername + " promoting " + newAdminUsername + " in group " + groupId);
        ChatRoom updated = chatService.assignAdmin(groupId, adminUsername, newAdminUsername);
        return ResponseEntity.ok(updated);
    }

    // ✅ GET GROUP DETAILS BY ID (used by frontend to show room name)
    @GetMapping("/groups/{groupId}")
    public ResponseEntity<?> getGroupDetails(@PathVariable String groupId) {
        var room = chatService.getGroupById(groupId);
        if (room == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(Map.of(
                "id", room.getId(),
                "name", room.getName(),
                "members", room.getMembers(),
                "admins", room.getAdmins()));
    }

    // ---------------- PRIVATE CHAT ENDPOINTS ----------------

    /**
     * Create or get a private DM between authenticated user and `otherUsername`.
     * Authenticated username is extracted from JWT header.
     */
    @PostMapping("/private/{otherUsername}")
    public ResponseEntity<ChatRoom> createOrGetPrivate(
            @PathVariable String otherUsername,
            @RequestHeader("Authorization") String authHeader) {

        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            return ResponseEntity.status(401).build();
        }
        String token = authHeader.substring(7);
        String me = jwtUtils.extractUsername(token); // reuse your jwt utility method

        if (me == null || me.isBlank())
            return ResponseEntity.status(401).build();

        ChatRoom room = chatService.getOrCreatePrivateChat(me, otherUsername);
        return ResponseEntity.ok(room);
    }

    /**
     * Get private chats for a given username (used by frontend to show DMs).
     */
    @GetMapping("/private/rooms/{username}")
public ResponseEntity<List<Map<String, Object>>> getPrivateRooms(@PathVariable String username) {
    List<Map<String, Object>> rooms = chatService.getPrivateChatsForUser(username);
    return ResponseEntity.ok(rooms);
}


}
