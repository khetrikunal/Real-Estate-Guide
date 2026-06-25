package com.real_estate.Kunal.Controller;

import com.real_estate.Kunal.DTO.AssignLeadRequest;
import com.real_estate.Kunal.DTO.CreateLeadRequest;
import com.real_estate.Kunal.DTO.LeadStatsResponse;
import com.real_estate.Kunal.DTO.UpdateLeadStatusRequest;
import com.real_estate.Kunal.Entity.Lead;
import com.real_estate.Kunal.Service.LeadService;
import jakarta.validation.Valid;

import lombok.RequiredArgsConstructor;

import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/leads")
@RequiredArgsConstructor
public class LeadController {

    private final LeadService leadService;

    @PostMapping("/create")
    public Map<String, Object> createLead(@Valid @RequestBody CreateLeadRequest request){
        return messageResponse(leadService.createLead(request));
    }
    @PostMapping("/assign")
    public Map<String, Object> assignLead(@Valid @RequestBody AssignLeadRequest request){
        return messageResponse(leadService.assignLead(request));
    }
    @PostMapping("/update-status")
    public Map<String, Object> updateStatus(@Valid @RequestBody UpdateLeadStatusRequest request){
        return messageResponse(leadService.updateLeadStatus(request));
    }
    @GetMapping("/all")
    public List<Lead> getAllLeads(){
        return leadService.getAllLeads();
    }

    @GetMapping("/stats")
    public LeadStatsResponse getLeadStats(){
        return leadService.getLeadStats();
    }

    // DELETE LEAD
    @DeleteMapping("/delete/{id}")
    public Map<String, Object> deleteLead(@PathVariable Long id){
        return messageResponse(leadService.deleteLead(id));
    }

    private Map<String, Object> messageResponse(String message) {
        Map<String, Object> response = new LinkedHashMap<>();
        response.put("message", message);
        return response;
    }
}
/**
 * Alternate route controller for singular "lead" resource path.
 * Supports backward compatibility with clients expecting /api/lead/* paths.
 */
@RestController
@RequestMapping("/api/lead")
@RequiredArgsConstructor
class LeadDeleteController {
    
    private final LeadService leadService;
    
    /**
     * DELETE /api/lead/delete/{id}
     * Alternative endpoint path for lead deletion.
     */
    @DeleteMapping("/delete/{id}")
    public Map<String, Object> deleteLead(@PathVariable Long id){
        return Map.of("message", leadService.deleteLead(id));
    }
}
