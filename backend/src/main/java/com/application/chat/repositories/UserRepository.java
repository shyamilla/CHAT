package com.application.chat.repositories;

import com.application.chat.models.User;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;
import java.util.Optional;

public interface UserRepository extends MongoRepository<User, String> {

    // Find user by email
    Optional<User> findByEmail(String email);

    // Find user by username
    Optional<User> findByUsername(String username);

    // Custom query — fetch only username field by email (for lightweight lookups)
    @Query(value = "{ 'email': ?0 }", fields = "{ 'username' : 1 }")
    Optional<User> findUsernameByEmail(String email);
}
