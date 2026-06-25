package com.real_estate.Kunal.Repository;

import com.real_estate.Kunal.Entity.Message;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface MessageRepository extends JpaRepository<Message, UUID> {

    Page<Message> findByConversationIdOrderByCreatedAtDesc(UUID conversationId, Pageable pageable);

    Optional<Message> findFirstByFileUrl(String fileUrl);

    Optional<Message> findFirstByFileUrlEndingWith(String suffix);

    @Query(value = """
        SELECT m.* FROM messages m
        JOIN conversation_participants cp ON cp.conversation_id = m.conversation_id
        WHERE cp.user_id = :userId
          AND (:convId IS NULL OR m.conversation_id = CAST(CAST(:convId AS VARCHAR) AS UUID))
          
          AND to_tsvector('english', m.content) @@ plainto_tsquery('english', :query)
        ORDER BY ts_rank(to_tsvector('english', m.content), plainto_tsquery('english', :query)) DESC,
                 m.created_at DESC
        LIMIT :limit OFFSET :offset
        """, nativeQuery = true)
    List<Message> searchMessages(
        @Param("userId") Long userId,
        @Param("convId") UUID convId,
        @Param("query") String query,
        @Param("limit") int limit,
        @Param("offset") int offset
    );
}
