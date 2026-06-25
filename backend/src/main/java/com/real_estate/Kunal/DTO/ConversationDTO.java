package com.real_estate.Kunal.DTO;

import lombok.*;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ConversationDTO {

    private String conversationId;
    private String type;
    private String name;
    private List<ParticipantDTO> participants;
    private Map<String, Object> lastMessage;
    private LocalDateTime lastMessageAt;
    private LocalDateTime createdAt;
    private int unreadCount;

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class ParticipantDTO {
        private String userId;
        private String name;
        private String email;
        private String role;
        private String profilePhotoUrl;
        private Boolean isOnline;
    }
}
