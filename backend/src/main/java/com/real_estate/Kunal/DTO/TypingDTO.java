package com.real_estate.Kunal.DTO;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TypingDTO {
    private String conversationId;
    private boolean isTyping;
}
