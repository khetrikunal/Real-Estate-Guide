package com.real_estate.Kunal.Repository;

import com.real_estate.Kunal.Entity.MessageReaction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface MessageReactionRepository extends JpaRepository<MessageReaction, MessageReaction.MessageReactionId> {

    List<MessageReaction> findByMessageId(UUID messageId);

    void deleteByMessageIdAndUserId(UUID messageId, Long userId);
}
