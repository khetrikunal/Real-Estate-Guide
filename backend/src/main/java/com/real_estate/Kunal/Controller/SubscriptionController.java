package com.real_estate.Kunal.Controller;

import com.real_estate.Kunal.DTO.SubscribeRequest;
import com.real_estate.Kunal.Entity.BrokerLocation;
import com.real_estate.Kunal.Entity.Subscription;
import com.real_estate.Kunal.Service.SubscriptionService;

import lombok.RequiredArgsConstructor;

import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/subscription")
@RequiredArgsConstructor
public class SubscriptionController {

    private final SubscriptionService subscriptionService;

    @PostMapping("/subscribe")
    @org.springframework.security.access.prepost.PreAuthorize("hasRole('SUPER_ADMIN')")
    public Subscription subscribe(@RequestBody SubscribeRequest request) {
        return subscriptionService.subscribe(request);
    }

    @GetMapping("/status/{userId}")
    @org.springframework.security.access.prepost.PreAuthorize("@subscriptionService.canAccessSubscription(#userId)")
    public boolean checkSubscription(@PathVariable Long userId) {
        return subscriptionService.hasActiveSubscription(userId);
    }

    @GetMapping("/{userId}")
    @org.springframework.security.access.prepost.PreAuthorize("@subscriptionService.canAccessSubscription(#userId)")
    public Map<String, Object> getSubscriptionDetails(@PathVariable Long userId) {

        Map<String, Object> result = new HashMap<>();

        Subscription subscription = subscriptionService.getActiveSubscription(userId);
        result.put("subscription", subscription);

        if (subscription != null) {
            List<BrokerLocation> locations = subscriptionService.getBrokerLocations(userId);
            result.put("brokerLocations", locations);
        }

        return result;
    }

}
