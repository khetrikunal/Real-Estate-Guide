package com.real_estate.Kunal.Service;

import com.real_estate.Kunal.DTO.SubscribeRequest;
import com.real_estate.Kunal.Entity.*;
import com.real_estate.Kunal.Repository.BrokerLocationRepository;
import com.real_estate.Kunal.Repository.PlanRepository;
import com.real_estate.Kunal.Repository.SubscriptionRepository;
import com.real_estate.Kunal.Repository.UserRepository;

import lombok.RequiredArgsConstructor;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;

@Service
@RequiredArgsConstructor
public class SubscriptionService {

    private final PlanRepository planRepository;
    private final SubscriptionRepository subscriptionRepository;
    private final BrokerLocationRepository brokerLocationRepository;
    private final UserRepository userRepository;

    @Transactional
    public Subscription subscribe(SubscribeRequest request) {

        PlanType planType = resolvePlanType(request.getPlanType());

        // Default duration – 365 days
        int durationDays = 365;

        // If a planId was associated, use its duration
        // For now we use a fixed duration since the flow is plan-type based
        LocalDate start = LocalDate.now();
        LocalDate end = start.plusDays(durationDays);

        Subscription subscription = Subscription.builder()
                .userId(request.getUserId())
                .planType(planType)
                .price(request.getPrice())
                .startDate(start)
                .endDate(end)
                .status("ACTIVE")
                .build();

        Subscription saved = subscriptionRepository.save(subscription);

        // If CUSTOM plan, save broker-location mappings
        if (planType == PlanType.CUSTOM && request.getLocationIds() != null) {

            // Clear existing mappings
            brokerLocationRepository.deleteByBrokerId(request.getUserId());

            for (Long locationId : request.getLocationIds()) {
                BrokerLocation bl = BrokerLocation.builder()
                        .brokerId(request.getUserId())
                        .locationId(locationId)
                        .build();
                brokerLocationRepository.save(bl);
            }
        }

        return saved;
    }

    public Subscription subscribe(Long userId, Long planId) {

        Plan plan = planRepository.findById(planId)
                .orElseThrow(() -> new RuntimeException("Plan not found"));

        LocalDate start = LocalDate.now();
        LocalDate end = start.plusDays(plan.getDurationDays());

        Subscription subscription = Subscription.builder()
                .userId(userId)
                .planId(planId)
                .planType(PlanType.ALL)
                .price(plan.getPrice())
                .startDate(start)
                .endDate(end)
                .status("ACTIVE")
                .build();

        return subscriptionRepository.save(subscription);
    }

    public boolean hasActiveSubscription(Long userId) {
        if (getActiveSubscription(userId) != null) {
            return true;
        }
        return userRepository.findById(userId)
                .map(this::hasActiveUserSubscription)
                .orElse(false);
    }

    public Subscription getActiveSubscription(Long userId) {
        return subscriptionRepository
                .findByUserIdAndStatus(userId, "ACTIVE")
                .filter(this::isCurrent)
                .orElse(null);
    }

    @Transactional
    public Subscription recordRenewal(Long userId, String planType, Double price, LocalDate startDate, LocalDate endDate) {
        Subscription subscription = subscriptionRepository
                .findByUserIdAndStatus(userId, "ACTIVE")
                .orElseGet(() -> Subscription.builder().userId(userId).build());

        subscription.setPlanType(resolvePlanType(planType));
        subscription.setPrice(price);
        subscription.setStartDate(startDate);
        subscription.setEndDate(endDate);
        subscription.setStatus("ACTIVE");

        return subscriptionRepository.save(subscription);
    }

    public List<BrokerLocation> getBrokerLocations(Long brokerId) {
        return brokerLocationRepository.findByBrokerId(brokerId);
    }

    private boolean isCurrent(Subscription subscription) {
        LocalDate endDate = subscription.getEndDate();
        return endDate == null || !endDate.isBefore(LocalDate.now());
    }

    private boolean hasActiveUserSubscription(User user) {
        if (user.getRole() != Role.SUB_ADMIN) {
            return false;
        }
        LocalDate expiresAt = user.getSubscriptionExpiresAt();
        return expiresAt == null || !expiresAt.isBefore(LocalDate.now());
    }

    private PlanType resolvePlanType(String planType) {
        if ("CUSTOM".equalsIgnoreCase(planType) || "location_based".equalsIgnoreCase(planType)) {
            return PlanType.CUSTOM;
        }
        return PlanType.ALL;
    }

}
