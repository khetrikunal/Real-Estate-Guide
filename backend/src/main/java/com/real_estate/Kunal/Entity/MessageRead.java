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
@Table(name = "message_reads")
@IdClass(MessageRead.MessageReadId.class)
public class MessageRead {

    @Id
    @Column(name = "message_id")
    private UUID messageId;

    @Id
    @Column(name = "user_id")
    private Long userId;

    @Builder.Default
    private LocalDateTime readAt = LocalDateTime.now();

    @NoArgsConstructor
    @AllArgsConstructor
    @EqualsAndHashCode
    public static class MessageReadId implements Serializable {
        private UUID messageId;
        private Long userId;
    }
}
