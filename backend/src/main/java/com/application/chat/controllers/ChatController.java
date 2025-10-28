package com.application.chat.controllers;

import com.application.chat.dtos.CreateGroupDTO;
import com.application.chat.dtos.ModifyGroupDTO;
import com.application.chat.models.ChatRoom;
import com.application.chat.services.ChatService;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/chats")
public class ChatController {

    private final ChatService chatService;
    private final SimpMessagingTemplate messagingTemplate;

    public ChatController(ChatService chatService, SimpMessagingTemplate messagingTemplate) {
        this.chatService = chatService;
        this.messagingTemplate = messagingTemplate;
    }

    // ✅ CREATE GROUP (now uses usernames)
    @PostMapping("/create")
    public ResponseEntity<ChatRoom> createGroup(@RequestBody CreateGroupDTO dto) {
        System.out.println("🟢 Creating new group: " + dto.getName() + " by " + dto.getCreatorUsername());

        ChatRoom room = chatService.createGroup(dto.getName(), dto.getCreatorUsername(), dto.getMemberUsernames());

        // ✅ Notify all members + admins in real-time (via WebSocket)
        try {
            List<String> recipients = room.getMembers();
            recipients.addAll(room.getAdmins());

            recipients.stream().distinct().forEach(user -> {
                System.out.println("📢 Notifying user: " + user);
                messagingTemplate.convertAndSendToUser(
                        user,
                        "/topic/updates",
                        "GROUP_CREATED:" + room.getName()
                );
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
}
