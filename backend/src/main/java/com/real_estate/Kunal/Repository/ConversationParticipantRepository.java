package com.real_estate.Kunal.Repository;

import com.real_estate.Kunal.Entity.ConversationParticipant;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface ConversationParticipantRepository
        extends JpaRepository<ConversationParticipant, ConversationParticipant.ConversationParticipantId> {

    List<ConversationParticipant> findByUserId(Long userId);

    List<ConversationParticipant> findByConversationId(UUID conversationId);

    boolean existsByConversationIdAndUserId(UUID conversationId, Long userId);
}
