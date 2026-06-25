package com.real_estate.Kunal.Repository;

import com.real_estate.Kunal.Entity.Conversation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ConversationRepository extends JpaRepository<Conversation, UUID> {

    @Query(value = """
        SELECT c.* FROM conversations c
        JOIN conversation_participants cp ON cp.conversation_id = c.id
        WHERE cp.user_id = :userId
        ORDER BY c.updated_at DESC
        """, nativeQuery = true)
    List<Conversation> findByParticipantUserId(@Param("userId") Long userId);

    @Query(value = """
        SELECT c.* FROM conversations c
        JOIN conversation_participants p1 ON p1.conversation_id = c.id AND p1.user_id = :user1
        JOIN conversation_participants p2 ON p2.conversation_id = c.id AND p2.user_id = :user2
        WHERE c.type = 'direct'
        LIMIT 1
        """, nativeQuery = true)
    Optional<Conversation> findDirectConversation(@Param("user1") Long user1, @Param("user2") Long user2);

    @Query(value = """
        SELECT c.* FROM conversations c
        JOIN conversation_participants cp ON cp.conversation_id = c.id
        WHERE cp.user_id = :userId
          AND c.name ILIKE CONCAT('%', :query, '%')
        ORDER BY c.updated_at DESC
        LIMIT :limit
        """, nativeQuery = true)
    List<Conversation> searchConversations(
        @Param("userId") Long userId,
        @Param("query") String query,
        @Param("limit") int limit
    );
}