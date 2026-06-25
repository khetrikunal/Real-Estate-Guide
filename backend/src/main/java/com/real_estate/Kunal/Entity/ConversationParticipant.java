package com.real_estate.Kunal.Entity;

import com.fasterxml.jackson.annotation.JsonBackReference;
import jakarta.persistence.*;
import lombok.*;

import java.io.Serializable;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Table(name = "conversation_participants")
@IdClass(ConversationParticipant.ConversationParticipantId.class)
public class ConversationParticipant {

    @Id
    @Column(name = "conversation_id")
    private UUID conversationId;

    @Id
    @Column(name = "user_id")
    private Long userId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "conversation_id", insertable = false, updatable = false)
    @JsonBackReference
    private Conversation conversation;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", insertable = false, updatable = false)
    @org.hibernate.annotations.OnDelete(action = org.hibernate.annotations.OnDeleteAction.CASCADE)
    private User user;

    @Builder.Default
    private LocalDateTime joinedAt = LocalDateTime.now();

    @Builder.Default
    private LocalDateTime lastReadAt = LocalDateTime.now();

    @NoArgsConstructor
    @AllArgsConstructor
    @EqualsAndHashCode
    public static class ConversationParticipantId implements Serializable {
        private UUID conversationId;
        private Long userId;
    }
}

