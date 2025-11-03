package com.application.chat.repositories;

import com.application.chat.models.ChatRoom;
import org.springframework.data.mongodb.repository.MongoRepository;
import java.util.List;
import java.util.Optional;

public interface ChatRoomRepository extends MongoRepository<ChatRoom, String> {
    List<ChatRoom> findByMembersContaining(String username);
    Optional<ChatRoom> findByName(String name);
    Optional<ChatRoom> findByNameAndIsPrivate(String name, boolean isPrivate);

    Optional<ChatRoom> findByPairKey(String pairKey);
}
