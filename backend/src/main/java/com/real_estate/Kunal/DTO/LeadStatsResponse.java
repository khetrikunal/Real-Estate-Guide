package com.real_estate.Kunal.DTO;


import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class LeadStatsResponse {

    private long totalLeads;

    private long newLeads;

    private long contacted;

    private long interested;

    private long closed;

}