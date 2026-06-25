package com.real_estate.Kunal.DTO;

import com.real_estate.Kunal.DTO.ConversationDTO;
import lombok.*;
import java.util.List;
import java.util.Map;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class GlobalSearchResultDTO {
    private List<MessageSearchResultDTO> messages;
    private List<ConversationDTO> conversations;
    private List<Map<String, Object>> contacts;
}
