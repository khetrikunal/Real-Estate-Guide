package com.real_estate.Kunal.DTO;

import lombok.*;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MessageSearchResultDTO {
    private String messageId;
    private String conversationId;
    private String conversationTitle;
    private String bodyPreview;
    private String query;
    private String senderName;
    private String senderAvatar;
    private LocalDateTime sentAt;
}
