package com.real_estate.Kunal.DTO;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ChatMessageDTO {
    private String conversationId;
    private String content;
    private String type;       // "text", "file", "image", "video"
    private String fileUrl;
    private String fileName;
    private Long fileSize;
    private String fileMimeType;
    private String replyToId;
}
