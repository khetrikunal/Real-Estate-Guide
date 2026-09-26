package com.real_estate.Kunal.Service;

import com.real_estate.Kunal.DTO.*;
import com.real_estate.Kunal.Entity.*;
import com.real_estate.Kunal.Repository.FollowUpRepository;
import com.real_estate.Kunal.Repository.LeadRepository;
import com.real_estate.Kunal.Repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.stream.Collectors;

@Service
@Slf4j
@RequiredArgsConstructor
public class FollowUpService {

    private final FollowUpRepository followUpRepository;
    private final LeadRepository leadRepository;
    private final UserRepository userRepository;

    // ── Current user resolution (same pattern as DashboardService) ──

    private User getCurrentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.isAuthenticated() && !auth.getPrincipal().equals("anonymousUser")) {
            return userRepository.findByEmail(auth.getName()).orElse(null);
        }
        return null;
    }

    /**
     * Get the list of owner user IDs visible to the current user based on role.
     * - SUPER_ADMIN: all users
     * - ADMIN: self + users with addedBy == adminId
     * - SUB_ADMIN: own only
     * - EMPLOYEE: own only
     */
    private List<Long> getVisibleOwnerIds(User user) {
        List<Long> ownerIds = new ArrayList<>();
        ownerIds.add(user.getId());

        if (user.getRole() == Role.SUPER_ADMIN) {
            // Super admin sees all — return all user IDs that have follow-ups
            return userRepository.findAll().stream()
                    .map(User::getId)
                    .collect(Collectors.toList());
        } else if (user.getRole() == Role.ADMIN) {
            // Admin sees self + subordinates (employees added by this admin)
            List<User> subordinates = userRepository.findByRoleAndAddedBy(Role.EMPLOYEE, user.getId());
            subordinates.forEach(s -> ownerIds.add(s.getId()));
        }
        // SUB_ADMIN and EMPLOYEE: own only (already added)

        return ownerIds;
    }

    // ── CRUD Operations ──

    @Transactional
    public FollowUpResponse createFollowUp(Long leadId, CreateFollowUpRequest request) {
        User currentUser = getCurrentUser();
        if (currentUser == null) {
            throw new RuntimeException("Authentication required");
        }

        Lead lead = leadRepository.findById(leadId)
                .orElseThrow(() -> new RuntimeException("Lead not found"));

        assertCanAccessLead(currentUser, lead);

        CallingType callingType = parseCallingType(request.getCallingType());

        // Validate scheduled date is not in the past
        if (request.getScheduledAt() == null || !request.getScheduledAt().isAfter(LocalDateTime.now())) {
            throw new RuntimeException("Cannot schedule follow-up in the past");
        }

        // Validate owner exists
        Long ownerId = request.getOwnerUserId();
        User owner = userRepository.findById(ownerId)
                .orElseThrow(() -> new RuntimeException("Owner user not found"));

        // Validate assignment permission
        validateAssignmentPermission(currentUser, owner);

        FollowUp followUp = FollowUp.builder()
                .lead(lead)
                .createdByUserId(currentUser.getId())
                .ownerUserId(ownerId)
                .customerName(lead.getCustomerName())
                .callingType(callingType)
                .description(request.getDescription())
                .scheduledAt(request.getScheduledAt())
                .isCompleted(false)
                .build();

        followUp = followUpRepository.save(followUp);
        return toResponse(followUp);
    }

    public List<FollowUpResponse> getFollowUpsForLead(Long leadId) {
        User currentUser = getCurrentUser();
        if (currentUser == null) {
            throw new RuntimeException("Authentication required");
        }
        Lead lead = leadRepository.findById(leadId)
                .orElseThrow(() -> new RuntimeException("Lead not found"));
        assertCanAccessLead(currentUser, lead);

        return followUpRepository.findByLeadIdAndDeletedAtIsNullOrderByScheduledAtAsc(leadId)
                .stream()
                .filter(followUp -> canAccessFollowUp(currentUser, followUp))
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    public FollowUpDashboardResponse getDashboard(LocalDateTime from, LocalDateTime to) {
        User currentUser = getCurrentUser();
        if (currentUser == null) {
            return FollowUpDashboardResponse.builder()
                    .totalCount(0).overdueCount(0).completedCount(0).pendingTodayCount(0)
                    .items(List.of()).build();
        }

        List<Long> ownerIds = getVisibleOwnerIds(currentUser);
        LocalDateTime now = LocalDateTime.now();

        List<FollowUp> followUps = followUpRepository
                .findVisibleDashboardFollowUps(ownerIds, from, to);

        long overdueCount = followUps.stream()
                .filter(f -> !f.getIsCompleted() && f.getScheduledAt().isBefore(now))
                .count();

        long completedCount = followUps.stream()
                .filter(FollowUp::getIsCompleted)
                .count();

        // Today's pending
        LocalDateTime todayStart = LocalDate.now().atStartOfDay();
        LocalDateTime todayEnd = LocalDate.now().atTime(LocalTime.MAX);
        long pendingToday = followUpRepository
                .countVisiblePendingBetween(
                        ownerIds, todayStart, todayEnd);

        List<FollowUpResponse> items = followUps.stream()
                .sorted(followUpDashboardComparator(now))
                .map(this::toResponse)
                .collect(Collectors.toList());

        return FollowUpDashboardResponse.builder()
                .totalCount(followUps.size())
                .overdueCount(overdueCount)
                .completedCount(completedCount)
                .pendingTodayCount(pendingToday)
                .items(items)
                .build();
    }

    /**
     * Get the count of today's pending follow-ups for the current user (for badge).
     */
    public long getPendingTodayCount() {
        User currentUser = getCurrentUser();
        if (currentUser == null) return 0;

        List<Long> ownerIds = getVisibleOwnerIds(currentUser);
        LocalDateTime todayStart = LocalDate.now().atStartOfDay();
        LocalDateTime todayEnd = LocalDate.now().atTime(LocalTime.MAX);

        return followUpRepository
                .countVisiblePendingBetween(
                        ownerIds, todayStart, todayEnd);
    }

    @Transactional
    public FollowUpResponse completeFollowUp(Long id, CompleteFollowUpRequest request) {
        User currentUser = getCurrentUser();
        if (currentUser == null) throw new RuntimeException("Authentication required");

        FollowUp followUp = followUpRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Follow-up not found"));

        if (followUp.getDeletedAt() != null) {
            throw new RuntimeException("Follow-up has been deleted");
        }
        assertCanAccessFollowUp(currentUser, followUp);
        if (followUp.getIsCompleted()) {
            throw new RuntimeException("Follow-up is already completed");
        }

        followUp.setIsCompleted(true);
        followUp.setCompletedAt(LocalDateTime.now());
        if (request != null && request.getCompletionNote() != null) {
            followUp.setCompletionNote(request.getCompletionNote());
        }

        followUp = followUpRepository.save(followUp);
        return toResponse(followUp);
    }

    @Transactional
    public FollowUpResponse rescheduleFollowUp(Long id, RescheduleFollowUpRequest request) {
        User currentUser = getCurrentUser();
        if (currentUser == null) throw new RuntimeException("Authentication required");

        FollowUp followUp = followUpRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Follow-up not found"));

        if (followUp.getDeletedAt() != null) {
            throw new RuntimeException("Follow-up has been deleted");
        }
        assertCanAccessFollowUp(currentUser, followUp);

        if (request.getScheduledAt() == null || !request.getScheduledAt().isAfter(LocalDateTime.now())) {
            throw new RuntimeException("Cannot reschedule follow-up in the past");
        }

        followUp.setScheduledAt(request.getScheduledAt());
        // Reset completion state if it was completed and we're rescheduling
        if (followUp.getIsCompleted()) {
            followUp.setIsCompleted(false);
            followUp.setCompletedAt(null);
            followUp.setCompletionNote(null);
        }

        followUp = followUpRepository.save(followUp);
        return toResponse(followUp);
    }

    @Transactional
    public String deleteFollowUp(Long id) {
        User currentUser = getCurrentUser();
        if (currentUser == null) throw new RuntimeException("Authentication required");

        FollowUp followUp = followUpRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Follow-up not found"));

        assertCanAccessFollowUp(currentUser, followUp);

        followUp.setDeletedAt(LocalDateTime.now());
        followUpRepository.save(followUp);
        return "Follow-up deleted successfully";
    }

    // ── Helpers ──

    private void validateAssignmentPermission(User actor, User owner) {
        // Super admin and admin can assign to self or subordinates
        if (actor.getRole() == Role.SUPER_ADMIN) return;

        if (actor.getRole() == Role.ADMIN) {
            // Can assign to self or employees added by this admin
            if (owner.getId().equals(actor.getId())) return;
            if (owner.getRole() == Role.EMPLOYEE
                    && owner.getAddedBy() != null
                    && owner.getAddedBy().equals(actor.getId())) return;
            throw new RuntimeException("Cannot assign follow-up to a user outside your team");
        }

        // Sub admin and employee can only assign to self
        if (!owner.getId().equals(actor.getId())) {
            throw new RuntimeException("You can only assign follow-ups to yourself");
        }
    }

    private void assertCanAccessLead(User actor, Lead lead) {
        if (actor.getRole() == Role.SUPER_ADMIN) {
            return;
        }
        Long assignedUserId = lead.getAssignedUserId();
        if (assignedUserId != null && getVisibleOwnerIds(actor).contains(assignedUserId)) {
            return;
        }
        throw new RuntimeException("Lead is outside your visible scope");
    }

    private boolean canAccessFollowUp(User actor, FollowUp followUp) {
        if (actor.getRole() == Role.SUPER_ADMIN) {
            return true;
        }
        List<Long> visibleOwnerIds = getVisibleOwnerIds(actor);
        return visibleOwnerIds.contains(followUp.getOwnerUserId())
                || visibleOwnerIds.contains(followUp.getCreatedByUserId());
    }

    private void assertCanAccessFollowUp(User actor, FollowUp followUp) {
        if (!canAccessFollowUp(actor, followUp)) {
            throw new RuntimeException("Follow-up is outside your visible scope");
        }
    }

    private Comparator<FollowUp> followUpDashboardComparator(LocalDateTime now) {
        return Comparator
                .comparing((FollowUp followUp) ->
                        !(Boolean.FALSE.equals(followUp.getIsCompleted())
                                && followUp.getScheduledAt().isBefore(now)))
                .thenComparing(FollowUp::getScheduledAt);
    }

    private CallingType parseCallingType(String rawType) {
        if (rawType == null) {
            throw new RuntimeException("Calling type is required");
        }
        String normalized = rawType.trim().toUpperCase().replace('-', '_').replace(' ', '_');
        if ("CLOSURE_CALL".equals(normalized)) {
            normalized = "CLOSURE";
        }
        try {
            return CallingType.valueOf(normalized);
        } catch (IllegalArgumentException e) {
            throw new RuntimeException("Invalid calling type: " + rawType);
        }
    }

    private FollowUpResponse toResponse(FollowUp followUp) {
        Lead lead = followUp.getLead();
        return FollowUpResponse.builder()
                .id(followUp.getId())
                .leadId(lead.getId())
                .customerName(followUp.getCustomerName())
                .leadPhone(lead.getPhone())
                .leadEmail(lead.getEmail())
                .leadStatus(lead.getStatus() == null ? null : lead.getStatus().name())
                .propertyInterest(lead.getPropertyInterest())
                .projectId(lead.getProjectId())
                .configId(lead.getConfigId())
                .city(lead.getCity())
                .createdByUserId(followUp.getCreatedByUserId())
                .ownerUserId(followUp.getOwnerUserId())
                .callingType(followUp.getCallingType().name())
                .description(followUp.getDescription())
                .scheduledAt(followUp.getScheduledAt())
                .completedAt(followUp.getCompletedAt())
                .isCompleted(followUp.getIsCompleted())
                .completionNote(followUp.getCompletionNote())
                .createdAt(followUp.getCreatedAt())
                .updatedAt(followUp.getUpdatedAt())
                .build();
    }
}
