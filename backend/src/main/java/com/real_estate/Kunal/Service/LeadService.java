package com.real_estate.Kunal.Service;
import com.real_estate.Kunal.DTO.AssignLeadRequest;
import com.real_estate.Kunal.DTO.CreateLeadRequest;
import com.real_estate.Kunal.DTO.LeadStatsResponse;
import com.real_estate.Kunal.DTO.UpdateLeadStatusRequest;
import com.real_estate.Kunal.Entity.Lead;
import com.real_estate.Kunal.Entity.LeadStatus;
import com.real_estate.Kunal.Entity.Project;
import com.real_estate.Kunal.Entity.ProjectConfig;
import com.real_estate.Kunal.Entity.Role;
import com.real_estate.Kunal.Entity.User;
import com.real_estate.Kunal.Repository.LeadRepository;
import com.real_estate.Kunal.Repository.ProjectConfigRepository;
import com.real_estate.Kunal.Repository.ProjectRepository;
import com.real_estate.Kunal.Repository.UserRepository;

import lombok.RequiredArgsConstructor;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class LeadService {

    private final LeadRepository leadRepository;
    private final UserRepository userRepository;
    private final ProjectRepository projectRepository;
    private final ProjectConfigRepository projectConfigRepository;

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

        Lead lead = Lead.builder()
                .customerName(request.getCustomerName())
                .phone(request.getPhone())
                .email(request.getEmail())
                .propertyInterest(resolvePropertyInterest(request, project, config))
                .projectId(request.getProjectId())
                .configId(request.getConfigId())
                .city(resolveLeadCity(request, project))
                .assignedEmployeeId(String.valueOf(currentUser.getId()))
                .status(LeadStatus.NEW)
                .build();

        leadRepository.save(lead);

        return "Lead Created Successfully";
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
        if (uploadedBy != null && getVisibleAssignedEmployeeIds(actor).contains(String.valueOf(uploadedBy))) {
            return;
        }
        throw new RuntimeException("Selected property not found");
    }

    public String assignLead(AssignLeadRequest request){
        User currentUser = requireCurrentUser();

        Lead lead = leadRepository.findById(request.getLeadId())
                .orElseThrow(() -> new RuntimeException("Lead not found"));

        assertCanAccessLead(currentUser, lead);
        assertCanAssignTo(currentUser, request.getEmployeeId());

        lead.setAssignedEmployeeId(request.getEmployeeId());

        leadRepository.save(lead);

        return "Lead assigned to employee " + request.getEmployeeId();
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
        if (currentUser.getRole() == Role.SUPER_ADMIN) {
            return leadRepository.findAll();
        }
        return leadRepository.findByAssignedEmployeeIdIn(getVisibleAssignedEmployeeIds(currentUser));
    }

    public LeadStatsResponse getLeadStats(){
        User currentUser = requireCurrentUser();
        List<String> visibleIds = getVisibleAssignedEmployeeIds(currentUser);
        boolean superAdmin = currentUser.getRole() == Role.SUPER_ADMIN;

        long total = superAdmin ? leadRepository.count() : leadRepository.countByAssignedEmployeeIdIn(visibleIds);

        long newLeads = countByStatus(LeadStatus.NEW, visibleIds, superAdmin);
        long contacted = countByStatus(LeadStatus.CONTACTED, visibleIds, superAdmin);
        long interested = countByStatus(LeadStatus.INTERESTED, visibleIds, superAdmin);
        long closed = countByStatus(LeadStatus.CLOSED, visibleIds, superAdmin);

        return LeadStatsResponse.builder()
                .totalLeads(total)
                .newLeads(newLeads)
                .contacted(contacted)
                .interested(interested)
                .closed(closed)
                .build();
    }

    //ADD Delete Leads
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

    private List<String> getVisibleAssignedEmployeeIds(User user) {
        List<Long> userIds = new ArrayList<>();
        userIds.add(user.getId());

        if (user.getRole() == Role.ADMIN) {
            userRepository.findByRoleAndAddedBy(Role.EMPLOYEE, user.getId())
                    .forEach(employee -> userIds.add(employee.getId()));
        }

        return userIds.stream()
                .map(String::valueOf)
                .collect(Collectors.toList());
    }

    private long countByStatus(LeadStatus status, List<String> visibleIds, boolean superAdmin) {
        return superAdmin
                ? leadRepository.countByStatus(status)
                : leadRepository.countByStatusAndAssignedEmployeeIdIn(status, visibleIds);
    }

    private void assertCanAccessLead(User actor, Lead lead) {
        if (actor.getRole() == Role.SUPER_ADMIN) {
            return;
        }
        String assignedEmployeeId = lead.getAssignedEmployeeId();
        if (assignedEmployeeId != null && getVisibleAssignedEmployeeIds(actor).contains(assignedEmployeeId)) {
            return;
        }
        throw new RuntimeException("Lead is outside your visible scope");
    }

    private void assertCanAssignTo(User actor, String employeeId) {
        if (actor.getRole() == Role.SUPER_ADMIN) {
            return;
        }
        if (getVisibleAssignedEmployeeIds(actor).contains(employeeId)) {
            return;
        }
        throw new RuntimeException("Cannot assign lead outside your visible scope");
    }
}
