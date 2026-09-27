package com.real_estate.Kunal.Service;
import com.real_estate.Kunal.DTO.AssignLeadRequest;
import com.real_estate.Kunal.DTO.CreateLeadRequest;
import com.real_estate.Kunal.DTO.LeadStatsResponse;
import com.real_estate.Kunal.DTO.UpdateLeadStatusRequest;
import com.real_estate.Kunal.Entity.Area;
import com.real_estate.Kunal.Entity.Lead;
import com.real_estate.Kunal.Entity.LeadStatus;
import com.real_estate.Kunal.Entity.Project;
import com.real_estate.Kunal.Entity.ProjectConfig;
import com.real_estate.Kunal.Entity.Role;
import com.real_estate.Kunal.Entity.User;
import com.real_estate.Kunal.Repository.AreaRepository;
import com.real_estate.Kunal.Repository.LeadRepository;
import com.real_estate.Kunal.Repository.ProjectConfigRepository;
import com.real_estate.Kunal.Repository.ProjectRepository;
import com.real_estate.Kunal.Repository.UserRepository;

import lombok.RequiredArgsConstructor;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
public class LeadService {

    private static final Logger log = LoggerFactory.getLogger(LeadService.class);

    private final LeadRepository leadRepository;
    private final UserRepository userRepository;
    private final ProjectRepository projectRepository;
    private final ProjectConfigRepository projectConfigRepository;
    private final AreaRepository areaRepository;
    private final LocationService locationService;

    @Transactional
    public String createLead(CreateLeadRequest request){
        User currentUser = requireCurrentUser();
        Project project = null;
        ProjectConfig config = null;

        if (request.getProjectId() != null) {
            project = projectRepository.findById(request.getProjectId())
                    .orElseThrow(() -> new RuntimeException("Selected property not found"));
            assertCanSelectProject(currentUser, project);
        }

        if (request.getConfigId() != null && request.getProjectId() == null) {
            throw new RuntimeException("Select a property before selecting configuration");
        }

        if (request.getConfigId() != null) {
            config = projectConfigRepository.findByIdAndProjectId(request.getConfigId(), request.getProjectId())
                    .orElseThrow(() -> new RuntimeException("Selected configuration does not belong to selected property"));
        }

        String resolvedCity = resolveLeadCity(request, project);
        Long resolvedAreaId = resolveAreaId(resolvedCity);
        String resolvedArea = project != null && project.getArea() != null ? project.getArea() : null;
        if (resolvedArea == null && resolvedAreaId != null) {
            resolvedArea = areaRepository.findById(resolvedAreaId).map(Area::getName).orElse(null);
        }

        // Enforce location scope: a location_based SUB_ADMIN or Employee may only create leads
        // in their assigned city/area (same guard as ProjectService.createProject).
        assertLeadScope(currentUser, resolvedCity, resolvedArea);

        Lead lead = Lead.builder()
                .customerName(request.getCustomerName())
                .phone(request.getPhone())
                .email(request.getEmail())
                .propertyInterest(resolvePropertyInterest(request, project, config))
                .projectId(request.getProjectId())
                .configId(request.getConfigId())
                .city(resolvedCity)
                .areaId(resolvedAreaId)           // nullable FK; null if city couldn't be matched
                .assignedUserId(currentUser.getId())   // typed Long FK
                .status(LeadStatus.NEW)
                .build();

        leadRepository.save(lead);

        return "Lead Created Successfully";
    }

    /**
     * Attempts to resolve a city/area name string to an {@link Area} ID.
     * Returns {@code null} if the string is blank or no area row matches.
     * A WARN log is emitted when a non-blank city string has no match, so the
     * data-quality issue is visible without breaking the request.
     */
    private Long resolveAreaId(String city) {
        if (!hasText(city)) {
            return null;
        }
        List<Area> matches = areaRepository.findByCityIgnoreCase(city);
        if (matches.isEmpty()) {
            // Try matching the value against area names instead of area.city
            // (city string on the lead often stores the area name, not the containing city)
            matches = areaRepository.findAll().stream()
                    .filter(a -> a.getName().equalsIgnoreCase(city.trim()))
                    .toList();
        }
        if (matches.isEmpty()) {
            log.warn("Lead city='{}' could not be matched to any area — areaId will be null", city);
            return null;
        }
        if (matches.size() > 1) {
            log.warn("Lead city='{}' matched {} areas — using the first match (id={})",
                    city, matches.size(), matches.get(0).getId());
        }
        return matches.get(0).getId();
    }

    private String resolvePropertyInterest(CreateLeadRequest request, Project project, ProjectConfig config) {
        if (project == null) {
            return request.getPropertyInterest();
        }

        String projectName = project.getProjectName();
        String configName = resolveConfigName(config);
        if (hasText(configName)) {
            return projectName + " - " + configName;
        }
        return projectName;
    }

    private String resolveLeadCity(CreateLeadRequest request, Project project) {
        if (project != null && hasText(project.getCity())) {
            return project.getCity();
        }
        return hasText(request.getCity()) ? request.getCity().trim() : null;
    }

    private String resolveConfigName(ProjectConfig config) {
        if (config == null) {
            return null;
        }
        if (hasText(config.getConfigLabel())) {
            return config.getConfigLabel();
        }
        if (hasText(config.getFlatType())) {
            return config.getFlatType();
        }
        return resolveBhk(config);
    }

    private String resolveBhk(ProjectConfig config) {
        try {
            Object bhk = config.getClass().getMethod("getBhk").invoke(config);
            return bhk == null ? null : String.valueOf(bhk);
        } catch (ReflectiveOperationException ex) {
            return null;
        }
    }

    private boolean hasText(String value) {
        return value != null && !value.trim().isEmpty();
    }

    private void assertCanSelectProject(User actor, Project project) {
        if (actor.getRole() == Role.SUPER_ADMIN) {
            return;
        }
        Long uploadedBy = project.getUploadedBy();
        if (uploadedBy != null && getVisibleAssignedUserIds(actor).contains(uploadedBy)) {
            return;
        }
        throw new RuntimeException("Selected property not found");
    }

    public String assignLead(AssignLeadRequest request){
        User currentUser = requireCurrentUser();

        Lead lead = leadRepository.findById(request.getLeadId())
                .orElseThrow(() -> new RuntimeException("Lead not found"));

        assertCanAccessLead(currentUser, lead);
        assertCanAssignTo(currentUser, request.getUserId());

        lead.setAssignedUserId(request.getUserId());

        leadRepository.save(lead);

        return "Lead assigned to user " + request.getUserId();
    }

    public String updateLeadStatus(UpdateLeadStatusRequest request){
        User currentUser = requireCurrentUser();

        Lead lead = leadRepository.findById(request.getLeadId())
                .orElseThrow(() -> new RuntimeException("Lead not found"));

        assertCanAccessLead(currentUser, lead);

        lead.setStatus(LeadStatus.valueOf(String.valueOf(request.getStatus())));

        leadRepository.save(lead);

        return "Lead status updated to " + request.getStatus();
    }

    public List<Lead> getAllLeads(){
        User currentUser = requireCurrentUser();
        List<Lead> leads;
        if (currentUser.getRole() == Role.SUPER_ADMIN) {
            leads = leadRepository.findAll();
        } else {
            leads = leadRepository.findByAssignedUserIdIn(getVisibleAssignedUserIds(currentUser));
        }
        // Post-filter by location scope for location_based SUB_ADMINs
        return filterLeadsForUserScope(leads, currentUser);
    }

    public LeadStatsResponse getLeadStats(){
        User currentUser = requireCurrentUser();
        List<Long> visibleIds = getVisibleAssignedUserIds(currentUser);
        boolean superAdmin = currentUser.getRole() == Role.SUPER_ADMIN;

        long total = superAdmin ? leadRepository.count() : leadRepository.countByAssignedUserIdIn(visibleIds);

        long newLeads  = countByStatus(LeadStatus.NEW,       visibleIds, superAdmin);
        long contacted = countByStatus(LeadStatus.CONTACTED, visibleIds, superAdmin);
        long interested= countByStatus(LeadStatus.INTERESTED,visibleIds, superAdmin);
        long closed    = countByStatus(LeadStatus.CLOSED,    visibleIds, superAdmin);

        return LeadStatsResponse.builder()
                .totalLeads(total)
                .newLeads(newLeads)
                .contacted(contacted)
                .interested(interested)
                .closed(closed)
                .build();
    }

    public String deleteLead(Long id){
        User currentUser = requireCurrentUser();
        Lead lead = leadRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Lead Not Found"));

        assertCanAccessLead(currentUser, lead);

        leadRepository.delete(lead);

        return "Lead Deleted Successfully";
    }

    private User requireCurrentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || "anonymousUser".equals(auth.getPrincipal())) {
            throw new RuntimeException("Authentication required");
        }
        return userRepository.findByEmail(auth.getName())
                .orElseThrow(() -> new RuntimeException("Authenticated user not found"));
    }

    /** Returns the set of user IDs that the given user is allowed to see leads for. */
    private List<Long> getVisibleAssignedUserIds(User user) {
        List<Long> userIds = new ArrayList<>();
        userIds.add(user.getId());

        if (user.getRole() == Role.ADMIN || user.getRole() == Role.SUB_ADMIN) {
            userRepository.findByRoleAndAddedBy(Role.EMPLOYEE, user.getId())
                    .forEach(employee -> userIds.add(employee.getId()));
        }

        return userIds;
    }

    private long countByStatus(LeadStatus status, List<Long> visibleIds, boolean superAdmin) {
        return superAdmin
                ? leadRepository.countByStatus(status)
                : leadRepository.countByStatusAndAssignedUserIdIn(status, visibleIds);
    }

    private void assertCanAccessLead(User actor, Lead lead) {
        if (actor.getRole() == Role.SUPER_ADMIN) {
            return;
        }
        Long assignedUserId = lead.getAssignedUserId();
        if (assignedUserId == null || !getVisibleAssignedUserIds(actor).contains(assignedUserId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Lead is outside your visible scope");
        }
        if (isLocationScoped(actor)) {
            String assignedCity = locationService.resolveUserCityName(actor);
            String assignedArea = locationService.resolveUserAreaName(actor);
            List<String> cityScopes = scopeValues(assignedCity);
            List<String> areaScopes = scopeValues(assignedArea);
            if (!cityScopes.isEmpty() && !hasAllScope(cityScopes) && !matchesScope(lead.getCity(), cityScopes)) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Lead is outside your assigned city");
            }
            if (!areaScopes.isEmpty() && !hasAllScope(areaScopes) && !leadMatchesAreaScope(lead, areaScopes)) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Lead is outside your assigned area");
            }
        }
    }

    private void assertCanAssignTo(User actor, Long targetUserId) {
        if (actor.getRole() == Role.SUPER_ADMIN) {
            return;
        }
        if (getVisibleAssignedUserIds(actor).contains(targetUserId)) {
            return;
        }
        throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Cannot assign lead outside your visible scope");
    }

    // ── Location scope enforcement (mirrors ProjectService pattern) ────────────

    /**
     * Throws 403 if a location_based SUB_ADMIN (or scoped EMPLOYEE) tries to create
     * a lead for a city/area outside their assigned scope. All other roles pass through.
     */
    private void assertLeadScope(User user, String city, String area) {
        if (!isLocationScoped(user)) {
            return;
        }
        String assignedCity = locationService.resolveUserCityName(user);
        String assignedArea = locationService.resolveUserAreaName(user);
        List<String> cityScopes = scopeValues(assignedCity);
        List<String> areaScopes = scopeValues(assignedArea);
        if (!cityScopes.isEmpty() && !hasAllScope(cityScopes) && !matchesScope(city, cityScopes)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "You can only create leads in your assigned city: " + assignedCity.trim());
        }
        if (!areaScopes.isEmpty() && !hasAllScope(areaScopes) && area != null && !area.isBlank() && !matchesScope(area, areaScopes)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "You can only create leads in your assigned area: " + assignedArea.trim());
        }
    }

    /**
     * Filters a lead list to only those whose city (or resolved area) is within the
     * user's assigned scope. Non-location-scoped users get the full list unchanged.
     */
    private List<Lead> filterLeadsForUserScope(List<Lead> leads, User user) {
        if (!isLocationScoped(user)) {
            return leads;
        }
        String assignedCity = locationService.resolveUserCityName(user);
        String assignedArea = locationService.resolveUserAreaName(user);
        List<String> cityScopes = scopeValues(assignedCity);
        List<String> areaScopes = scopeValues(assignedArea);
        if (cityScopes.isEmpty() || hasAllScope(cityScopes)) {
            return leads;
        }
        return leads.stream()
                .filter(lead -> matchesScope(lead.getCity(), cityScopes))
                .filter(lead -> areaScopes.isEmpty() || hasAllScope(areaScopes) || leadMatchesAreaScope(lead, areaScopes))
                .toList();
    }

    private boolean isLocationScoped(User user) {
        if (user == null) return false;
        if (user.getRole() == Role.SUB_ADMIN) {
            return "location_based".equalsIgnoreCase(user.getSubscriptionType());
        }
        if (user.getRole() == Role.EMPLOYEE) {
            if ("location_based".equalsIgnoreCase(user.getSubscriptionType())) return true;
            if (user.getAssignedCity() != null && !user.getAssignedCity().isBlank()) return true;
            if (user.getAddedBy() != null) {
                return userRepository.findById(user.getAddedBy())
                        .map(parent -> "location_based".equalsIgnoreCase(parent.getSubscriptionType()))
                        .orElse(false);
            }
        }
        return false;
    }

    /**
     * True if the lead's resolved areaId maps to an area whose name is in areaScopes,
     * OR if the lead's city string itself matches (for leads without a resolved areaId).
     */
    private boolean leadMatchesAreaScope(Lead lead, List<String> areaScopes) {
        if (lead.getAreaId() != null) {
            return areaRepository.findById(lead.getAreaId())
                    .map(a -> matchesScope(a.getName(), areaScopes))
                    .orElse(false);
        }
        // Fallback: match the city string against area scopes (degraded mode for unresolved leads)
        return matchesScope(lead.getCity(), areaScopes);
    }

    // ── Location scope helpers (mirrors ProjectService) ────────────────────────

    private List<String> scopeValues(String value) {
        if (value == null || value.isBlank()) {
            return List.of();
        }
        return Arrays.stream(value.split(","))
                .map(String::trim)
                .filter(part -> !part.isEmpty())
                .toList();
    }

    private boolean hasAllScope(List<String> values) {
        return values.stream().anyMatch(value -> {
            String normalized = value.trim().toLowerCase().replace('-', '_').replace(' ', '_');
            return "all".equals(normalized) || "all_locations".equals(normalized) || "*".equals(normalized);
        });
    }

    private boolean matchesScope(String value, List<String> scopes) {
        if (scopes.isEmpty() || hasAllScope(scopes)) {
            return true;
        }
        if (value == null || value.isBlank()) {
            return false;
        }
        return scopes.stream().anyMatch(scope -> scope.equalsIgnoreCase(value.trim()));
    }
}
