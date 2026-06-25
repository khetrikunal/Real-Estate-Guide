package com.real_estate.Kunal.Controller;

import com.real_estate.Kunal.DTO.*;
import com.real_estate.Kunal.Service.FollowUpService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/crm")
@RequiredArgsConstructor
public class CrmController {

    private final FollowUpService followUpService;

    @PostMapping("/leads/{leadId}/follow-ups")
    public FollowUpResponse createFollowUp(
            @PathVariable Long leadId,
            @Valid @RequestBody CreateFollowUpRequest request) {
        return followUpService.createFollowUp(leadId, request);
    }

    @GetMapping("/leads/{leadId}/follow-ups")
    public List<FollowUpResponse> getLeadFollowUps(@PathVariable Long leadId) {
        return followUpService.getFollowUpsForLead(leadId);
    }

    @GetMapping("/follow-ups/dashboard")
    public FollowUpDashboardResponse getDashboard(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        LocalDate today = LocalDate.now();
        LocalDate start = from != null ? from : today.minusDays(30);
        LocalDate end = to != null ? to : today.plusDays(30);
        return followUpService.getDashboard(
                start.atStartOfDay(),
                end.atTime(LocalTime.MAX));
    }

    @GetMapping("/follow-ups/pending-count")
    public Map<String, Long> getPendingCount() {
        Map<String, Long> response = new LinkedHashMap<>();
        response.put("count", followUpService.getPendingTodayCount());
        return response;
    }

    @PatchMapping("/follow-ups/{id}/complete")
    public FollowUpResponse completeFollowUp(
            @PathVariable Long id,
            @RequestBody(required = false) CompleteFollowUpRequest request) {
        return followUpService.completeFollowUp(id, request);
    }

    @PatchMapping("/follow-ups/{id}/reschedule")
    public FollowUpResponse rescheduleFollowUp(
            @PathVariable Long id,
            @Valid @RequestBody RescheduleFollowUpRequest request) {
        return followUpService.rescheduleFollowUp(id, request);
    }

    @DeleteMapping("/follow-ups/{id}")
    public Map<String, Object> deleteFollowUp(@PathVariable Long id) {
        Map<String, Object> response = new LinkedHashMap<>();
        response.put("message", followUpService.deleteFollowUp(id));
        return response;
    }
}
