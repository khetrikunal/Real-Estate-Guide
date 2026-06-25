package com.real_estate.Kunal.DTO;

import lombok.Data;

@Data
public class ChatMessage {

    private Long conversationId;

    private Long senderId;

    private String content;

}