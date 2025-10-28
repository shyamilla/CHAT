package com.application.chat.services;

import com.application.chat.models.ChatMessage;
import com.application.chat.models.ChatRoom;
import com.application.chat.models.User;
import com.application.chat.repositories.ChatMessageRepository;
import com.application.chat.repositories.ChatRoomRepository;
import com.application.chat.repositories.UserRepository;
import com.application.chat.config.JwtUtils;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.*;

@Service
public class ChatService {

    private final ChatRoomRepository chatRoomRepository;
    private final ChatMessageRepository chatMessageRepository;
    private final UserRepository userRepository;
    private final SimpMessagingTemplate messagingTemplate;
    private final JwtUtils jwtUtils;

    public ChatService(ChatRoomRepository chatRoomRepository,
                       ChatMessageRepository chatMessageRepository,
                       UserRepository userRepository,
                       SimpMessagingTemplate messagingTemplate,
                       JwtUtils jwtUtils) {
        this.chatRoomRepository = chatRoomRepository;
        this.chatMessageRepository = chatMessageRepository;
        this.userRepository = userRepository;
        this.messagingTemplate = messagingTemplate;
        this.jwtUtils = jwtUtils;
    }

    // ✅ CREATE GROUP (supports creator as email or username)
    public ChatRoom createGroup(String groupName, String creatorIdentifier, List<String> memberInputs) {
        if (creatorIdentifier == null || creatorIdentifier.isBlank()) {
            throw new RuntimeException("Creator username/email is required.");
        }

        // 🔍 Try to find creator by email or username
        User creator = userRepository.findByEmail(creatorIdentifier)
                .or(() -> userRepository.findByUsername(creatorIdentifier))
                .orElseThrow(() -> new RuntimeException("Creator not found: " + creatorIdentifier));

        String creatorUsername = creator.getUsername();

        // 👥 Initialize members (add creator)
        Set<String> members = new HashSet<>();
        members.add(creatorUsername);

        if (memberInputs != null && !memberInputs.isEmpty()) {
            for (String input : memberInputs) {
                if (input == null || input.isBlank()) continue;

                // Convert email -> username if necessary
                String username = input.contains("@")
                        ? fetchUsernameByEmailOrNull(input)
                        : input;

                if (username != null && !username.equalsIgnoreCase(creatorUsername)) {
                    members.add(username);
                }
            }
        }

        // 🔑 Creator is also admin
        Set<String> admins = new HashSet<>();
        admins.add(creatorUsername);

        // 🧱 Build chat room
        ChatRoom room = new ChatRoom();
        room.setName(groupName);
        room.setAdmins(new ArrayList<>(admins));
        room.setMembers(new ArrayList<>(members));

        ChatRoom saved = chatRoomRepository.save(room);
        System.out.println("✅ Group created: " + saved.getName() + " by " + creatorUsername);
        System.out.println("📋 Admins: " + saved.getAdmins());
        System.out.println("👥 Members: " + saved.getMembers());

        // 🔔 Notify all members in real-time
        broadcastGroupUpdate(saved);
        return saved;
    }

    // ✅ FETCH ALL GROUPS A USER BELONGS TO
    public List<ChatRoom> getAllUserChatRooms(String username) {
        System.out.println("📡 Fetching chat rooms for user: " + username);
        return chatRoomRepository.findByMembersContaining(username);
    }

    // ✅ ADD MEMBERS
    public ChatRoom addMembers(String groupId, List<String> inputs) {
        ChatRoom group = getGroupById(groupId);
        if (inputs == null || inputs.isEmpty())
            throw new RuntimeException("No members provided");

        Set<String> newMembers = new HashSet<>();
        for (String input : inputs) {
            if (input == null || input.isBlank()) continue;

            String username = input.contains("@")
                    ? fetchUsernameByEmailOrNull(input)
                    : input;

            if (username != null && !group.getMembers().contains(username)) {
                newMembers.add(username);
            }
        }

        if (newMembers.isEmpty()) {
            System.out.println("ℹ️ No valid new members to add.");
            return group;
        }

        group.getMembers().addAll(newMembers);
        ChatRoom updated = chatRoomRepository.save(group);

        System.out.println("👥 Added members " + newMembers + " to group " + group.getName());
        broadcastGroupUpdate(updated);
        return updated;
    }

    // ✅ REMOVE MEMBER
    public ChatRoom removeMember(String groupId, String adminUsername, String memberToRemove) {
        ChatRoom group = getGroupById(groupId);

        if (!group.getAdmins().contains(adminUsername)) {
            throw new RuntimeException("Only admins can remove members.");
        }

        if (!group.getMembers().contains(memberToRemove)) {
            throw new RuntimeException("User is not a member of this group.");
        }

        group.getMembers().remove(memberToRemove);
        group.getAdmins().remove(memberToRemove);

        ChatRoom updated = chatRoomRepository.save(group);
        System.out.println("❌ Removed member " + memberToRemove + " from group " + group.getName());

        broadcastGroupUpdate(updated);
        messagingTemplate.convertAndSendToUser(
                memberToRemove,
                "/topic/updates",
                "You were removed from group " + group.getName()
        );

        return updated;
    }

    // ✅ ASSIGN NEW ADMIN
    public ChatRoom assignAdmin(String groupId, String adminUsername, String newAdminUsername) {
        ChatRoom group = getGroupById(groupId);

        if (!group.getAdmins().contains(adminUsername)) {
            throw new RuntimeException("Only admins can promote members.");
        }

        if (!group.getMembers().contains(newAdminUsername)) {
            throw new RuntimeException("New admin must be a member of the group.");
        }

        if (!group.getAdmins().contains(newAdminUsername)) {
            group.getAdmins().add(newAdminUsername);
            System.out.println("⭐ Promoted " + newAdminUsername + " to admin in " + group.getName());
        }

        ChatRoom updated = chatRoomRepository.save(group);
        broadcastGroupUpdate(updated);
        return updated;
    }

    // ✅ SAVE MESSAGE
    public ChatMessage saveMessage(String roomId, String senderUsername, String content) {
        ChatMessage message = new ChatMessage(roomId, senderUsername, content, Instant.now());
        ChatMessage saved = chatMessageRepository.save(message);
        System.out.println("💬 Message saved from " + senderUsername + " in " + roomId);
        return saved;
    }

    // ✅ GET MESSAGES
    public List<ChatMessage> getMessages(String roomId) {
        return chatMessageRepository.findByRoomIdOrderByTimestampAsc(roomId);
    }

    // ✅ Broadcast updates
    private void broadcastGroupUpdate(ChatRoom group) {
        group.getMembers().forEach(member ->
                messagingTemplate.convertAndSendToUser(
                        member,
                        "/topic/updates",
                        "Group updated: " + group.getName()
                )
        );
    }

    // ✅ Helper: Get username from email if needed
    private String fetchUsernameByEmailOrNull(String email) {
        if (email == null) return null;
        return userRepository.findByEmail(email)
                .map(User::getUsername)
                .orElse(null);
    }

    // ✅ Helper: Fetch group safely
    private ChatRoom getGroupById(String id) {
        return chatRoomRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Group not found: " + id));
    }
}
