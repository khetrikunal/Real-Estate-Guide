package com.real_estate.Kunal.DTO;

import lombok.Builder;
import lombok.Data;
import java.util.List;

@Data
@Builder
public class SubAdminDetailsDTO {
    private Long id;
    private String name;
    private String email;
    private String planType;
    private List<String> locations;
}
