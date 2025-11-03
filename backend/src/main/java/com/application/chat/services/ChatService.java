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
import java.util.stream.Collectors;

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

    // =====================================================
    // 🟩 GROUP CHAT OPERATIONS
    // =====================================================

    public ChatRoom createGroup(String groupName, String creatorIdentifier, List<String> memberInputs) {
        User creator = userRepository.findByEmail(creatorIdentifier)
                .or(() -> userRepository.findByUsername(creatorIdentifier))
                .orElseThrow(() -> new RuntimeException("Creator not found: " + creatorIdentifier));

        String creatorUsername = creator.getUsername();

        Set<String> members = new HashSet<>();
        members.add(creatorUsername);

        if (memberInputs != null) {
            for (String input : memberInputs) {
                String username = normalizeUsername(input);
                if (username != null && !username.equalsIgnoreCase(creatorUsername)) {
                    members.add(username);
                }
            }
        }

        ChatRoom group = new ChatRoom();
        group.setName(groupName);
        group.setAdmins(List.of(creatorUsername));
        group.setMembers(new ArrayList<>(members));
        group.setPrivate(false);
        group.setGroup(true);

        ChatRoom saved = chatRoomRepository.save(group);
        broadcastGroupUpdate(saved);
        return saved;
    }

    public ChatRoom addMembers(String groupId, List<String> inputs) {
        ChatRoom group = getGroupById(groupId);
        validateGroup(group);

        Set<String> newMembers = new HashSet<>(group.getMembers());
        for (String input : inputs) {
            String username = normalizeUsername(input);
            if (username != null) newMembers.add(username);
        }

        group.setMembers(new ArrayList<>(newMembers));
        ChatRoom updated = chatRoomRepository.save(group);
        broadcastGroupUpdate(updated);
        return updated;
    }

    public ChatRoom removeMember(String groupId, String adminUsername, String memberToRemove) {
        ChatRoom group = getGroupById(groupId);
        validateGroup(group);

        if (!group.getAdmins().contains(adminUsername))
            throw new RuntimeException("Only admins can remove members.");

        group.getMembers().remove(memberToRemove);
        group.getAdmins().remove(memberToRemove);

        ChatRoom updated = chatRoomRepository.save(group);
        broadcastGroupUpdate(updated);
        return updated;
    }

    public ChatRoom assignAdmin(String groupId, String adminUsername, String newAdminUsername) {
        ChatRoom group = getGroupById(groupId);
        validateGroup(group);

        if (!group.getAdmins().contains(adminUsername))
            throw new RuntimeException("Only admins can promote.");
        if (!group.getMembers().contains(newAdminUsername))
            throw new RuntimeException("New admin must be a member.");

        if (!group.getAdmins().contains(newAdminUsername))
            group.getAdmins().add(newAdminUsername);

        ChatRoom updated = chatRoomRepository.save(group);
        broadcastGroupUpdate(updated);
        return updated;
    }

    // =====================================================
    // 💬 MESSAGE OPERATIONS
    // =====================================================

    public ChatMessage saveMessage(ChatMessage msg) {
        msg.setTimestamp(Instant.now());

        // Normalize sender and receiver usernames
        msg.setSenderUsername(normalizeUsername(msg.getSenderUsername()));
        if (msg.getReceiverUsername() != null) {
            msg.setReceiverUsername(normalizeUsername(msg.getReceiverUsername()));
        }

        // ✅ Save message in DB
        ChatMessage saved = chatMessageRepository.save(msg);

        // ✅ Private Chat
        if (msg.getReceiverUsername() != null && !msg.getReceiverUsername().isEmpty()) {
            System.out.println("📩 Private message: " + msg.getSenderUsername() + " → " + msg.getReceiverUsername());

            // Send to receiver
            messagingTemplate.convertAndSendToUser(
                    msg.getReceiverUsername(),
                    "/queue/private",
                    saved
            );

            // Also send to sender (for instant UI update)
            messagingTemplate.convertAndSendToUser(
                    msg.getSenderUsername(),
                    "/queue/private",
                    saved
            );

        }
        // ✅ Group Chat
        else if (msg.getRoomId() != null) {
            System.out.println("📢 Group message in room " + msg.getRoomId());
            messagingTemplate.convertAndSend("/topic/messages/" + msg.getRoomId(), saved);
        }

        return saved;
    }

    public List<ChatMessage> getMessages(String roomId) {
        return chatMessageRepository.findByRoomIdOrderByTimestampAsc(roomId);
    }

    // =====================================================
    // 🔒 PRIVATE CHAT OPERATIONS
    // =====================================================

    public ChatRoom createPrivateChat(String senderUsername, String receiverUsername) {
    if (senderUsername == null || receiverUsername == null)
        throw new RuntimeException("Usernames required");

    String sUser = normalizeUsername(senderUsername);
    String rUser = normalizeUsername(receiverUsername);

    // ✅ Stable, sorted key for the user pair
    String pairKey = buildPrivateChatName(sUser, rUser);

    // ✅ Check if one already exists
    Optional<ChatRoom> existing = chatRoomRepository.findByPairKey(pairKey);
    if (existing.isPresent()) {
        return existing.get();
    }

    // ✅ Otherwise create it once
    ChatRoom room = new ChatRoom();
    room.setName(pairKey);
    room.setPairKey(pairKey);
    room.setPrivate(true);
    room.setGroup(false);
    room.setAdmins(Collections.emptyList());
    room.setMembers(List.of(sUser, rUser));

    return chatRoomRepository.save(room);
}


    // =====================================================
    // 📋 FETCH USER CHATS
    // =====================================================

    public List<Map<String, Object>> getPrivateChatsForUser(String username) {
        List<ChatRoom> all = chatRoomRepository.findByMembersContaining(username);
        Set<String> seen = new HashSet<>();
        List<Map<String, Object>> privateChats = new ArrayList<>();

        for (ChatRoom r : all) {
            if (!r.isPrivate()) continue;

            String other = r.getMembers().stream()
                    .filter(m -> !m.equalsIgnoreCase(username))
                    .findFirst()
                    .orElse(username);

            other = normalizeUsername(other);

            if (!seen.add(other.toLowerCase())) continue;

            privateChats.add(Map.of(
                    "id", r.getId(),
                    "isGroup", false,
                    "displayName", other,
                    "members", r.getMembers(),
                    "type", "private"
            ));
        }
        return privateChats;
    }

    public List<Map<String, Object>> getGroupChatsForUser(String username) {
        List<ChatRoom> allRooms = chatRoomRepository.findByMembersContaining(username);

        return allRooms.stream()
                .filter(ChatRoom::isGroup)
                .map(r -> Map.of(
                        "id", r.getId(),
                        "isGroup", true,
                        "displayName", r.getName(),
                        "members", r.getMembers(),
                        "type", "group"
                ))
                .collect(Collectors.toList());
    }

    public List<Map<String, Object>> getAllUserChatRooms(String username) {
        List<Map<String, Object>> all = new ArrayList<>();
        all.addAll(getPrivateChatsForUser(username));
        all.addAll(getGroupChatsForUser(username));

        Set<String> names = new HashSet<>();
        return all.stream()
                .filter(room -> {
                    String name = (String) room.get("displayName");
                    return name != null && names.add(name.toLowerCase());
                })
                .collect(Collectors.toList());
    }

    // =====================================================
    // ⚙️ HELPERS
    // =====================================================

    private void validateGroup(ChatRoom group) {
        if (!group.isGroup())
            throw new RuntimeException("This operation is for groups only.");
    }

    private String normalizeUsername(String input) {
        if (input == null) return null;
        input = input.trim();
        if (input.contains("@")) {
            return userRepository.findByEmail(input)
                    .map(User::getUsername)
                    .orElse(input);
        }
        return input;
    }

    private boolean containsBoth(List<String> members, String a, String b) {
        List<String> lower = members.stream().map(String::toLowerCase).toList();
        return lower.contains(a.toLowerCase()) && lower.contains(b.toLowerCase());
    }

    private String buildPrivateChatName(String a, String b) {
        List<String> pair = Arrays.asList(a.toLowerCase(), b.toLowerCase());
        Collections.sort(pair);
        return String.join("-", pair);
    }

    public ChatRoom getGroupById(String id) {
        return chatRoomRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Group not found: " + id));
    }

    private void broadcastGroupUpdate(ChatRoom group) {
        if (group.getMembers() == null) return;

        for (String member : group.getMembers()) {
            try {
                messagingTemplate.convertAndSendToUser(
                        member,
                        "/queue/chats",
                        getAllUserChatRooms(member)
                );
            } catch (Exception e) {
                System.out.println("⚠️ Failed to push chat update to " + member + ": " + e.getMessage());
            }
        }
    }

    // =====================================================
// 🧭 FETCH CHAT ROOM BY ID
// =====================================================
public ChatRoom getRoomById(String roomId) {
    return chatRoomRepository.findById(roomId)
            .orElseThrow(() -> new RuntimeException("Chat room not found: " + roomId));
}

}
