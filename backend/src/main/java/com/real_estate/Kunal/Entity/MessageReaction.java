package com.real_estate.Kunal.Entity;

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
@Table(name = "message_reactions",
       uniqueConstraints = @UniqueConstraint(columnNames = {"message_id", "user_id"}))
@IdClass(MessageReaction.MessageReactionId.class)
public class MessageReaction {

    @Id
    @Column(name = "message_id")
    private UUID messageId;

    @Id
    @Column(name = "user_id")
    private Long userId;

    @Column(nullable = false, length = 10)
    private String emoji;

    @Builder.Default
    private LocalDateTime reactedAt = LocalDateTime.now();

    @NoArgsConstructor
    @AllArgsConstructor
    @EqualsAndHashCode
    public static class MessageReactionId implements Serializable {
        private UUID messageId;
        private Long userId;
    }
}
