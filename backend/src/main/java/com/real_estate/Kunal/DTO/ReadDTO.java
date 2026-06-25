package com.real_estate.Kunal.DTO;

import lombok.*;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ReadDTO {
    private String conversationId;
    private List<String> messageIds;
}
