package com.real_estate.Kunal.Service;

import com.real_estate.Kunal.Repository.ConversationParticipantRepository;
import com.real_estate.Kunal.Repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ChatEvents {
    private final ConversationParticipantRepository participants;
    private final UserRepository users;
    private final SimpMessagingTemplate messaging;

    public void publish(UUID conversationId, String type) {
        var recipients = participants.findByConversationId(conversationId).stream()
                .map(p -> users.findById(p.getUserId()).orElse(null))
                .filter(java.util.Objects::nonNull).map(u -> u.getEmail()).distinct().toList();
        Runnable send = () -> recipients.forEach(email -> messaging.convertAndSendToUser(email,
                "/queue/chat", Map.of("type", type, "conversationId", conversationId.toString())));
        // A client fetching immediately after this event must see committed data.
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override public void afterCommit() { send.run(); }
            });
        } else send.run();
    }
}
