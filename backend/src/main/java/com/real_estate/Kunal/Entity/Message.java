package com.real_estate.Kunal.Entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Table(name = "messages")
public class Message {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "conversation_id", nullable = false)
    private Conversation conversation;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "sender_id", nullable = false)
    @org.hibernate.annotations.OnDelete(action = org.hibernate.annotations.OnDeleteAction.CASCADE)
    private User sender;

    @Builder.Default
    private String type = "text";  // "text", "file", "image"

    @Column(columnDefinition = "TEXT")
    private String content;

    private String fileUrl;
    private String fileName;
    private Long fileSize;
    private String fileMimeType;

    @Column(name = "reply_to_id")
    private UUID replyToId;
    
    private LocalDateTime editedAt;

    @CreationTimestamp
    @Column(updatable = false)
    private LocalDateTime createdAt;
}

