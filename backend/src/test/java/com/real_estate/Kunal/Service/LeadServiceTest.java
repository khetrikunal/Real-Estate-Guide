package com.real_estate.Kunal.Service;

import com.real_estate.Kunal.DTO.CreateLeadRequest;
import com.real_estate.Kunal.Entity.Lead;
import com.real_estate.Kunal.Entity.Project;
import com.real_estate.Kunal.Entity.ProjectConfig;
import com.real_estate.Kunal.Entity.Role;
import com.real_estate.Kunal.Entity.User;
import com.real_estate.Kunal.Repository.LeadRepository;
import com.real_estate.Kunal.Repository.ProjectConfigRepository;
import com.real_estate.Kunal.Repository.ProjectRepository;
import com.real_estate.Kunal.Repository.UserRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class LeadServiceTest {

    @Mock
    private LeadRepository leadRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private ProjectRepository projectRepository;

    @Mock
    private ProjectConfigRepository projectConfigRepository;

    @AfterEach
    void clearSecurityContext() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void createLeadStoresSelectedProjectConfigAndReadableInterest() {
        LeadService service = new LeadService(
                leadRepository,
                userRepository,
                projectRepository,
                projectConfigRepository
        );
        User currentUser = currentAdminUser();
        Project project = selectedProject();
        ProjectConfig config = selectedConfig(project);
        CreateLeadRequest request = createLeadRequest(100L, 200L);

        authenticateAs("admin@example.com");
        when(userRepository.findByEmail("admin@example.com")).thenReturn(Optional.of(currentUser));
        when(projectRepository.findById(100L)).thenReturn(Optional.of(project));
        when(projectConfigRepository.findByIdAndProjectId(200L, 100L)).thenReturn(Optional.of(config));

        String message = service.createLead(request);

        assertThat(message).isEqualTo("Lead Created Successfully");
        ArgumentCaptor<Lead> captor = ArgumentCaptor.forClass(Lead.class);
        verify(leadRepository).save(captor.capture());
        Lead savedLead = captor.getValue();
        assertThat(savedLead.getCustomerName()).isEqualTo("Asha Shah");
        assertThat(savedLead.getPhone()).isEqualTo("9876543210");
        assertThat(savedLead.getEmail()).isEqualTo("asha@example.com");
        assertThat(savedLead.getProjectId()).isEqualTo(100L);
        assertThat(savedLead.getConfigId()).isEqualTo(200L);
        assertThat(savedLead.getCity()).isEqualTo("Pune");
        assertThat(savedLead.getAssignedEmployeeId()).isEqualTo("42");
        assertThat(savedLead.getPropertyInterest())
                .contains("Skyline Towers")
                .contains("2 BHK Premium");
    }

    @Test
    void createLeadRejectsConfigOutsideSelectedProject() {
        LeadService service = new LeadService(
                leadRepository,
                userRepository,
                projectRepository,
                projectConfigRepository
        );
        User currentUser = currentAdminUser();
        Project project = selectedProject();
        CreateLeadRequest request = createLeadRequest(100L, 999L);

        authenticateAs("admin@example.com");
        when(userRepository.findByEmail("admin@example.com")).thenReturn(Optional.of(currentUser));
        when(projectRepository.findById(100L)).thenReturn(Optional.of(project));
        when(projectConfigRepository.findByIdAndProjectId(999L, 100L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.createLead(request))
                .isInstanceOf(RuntimeException.class)
                .hasMessage("Selected configuration does not belong to selected property");
        verify(leadRepository, never()).save(any());
    }

    @Test
    void createLeadRejectsEmployeeProjectOutsideVisibleScope() {
        LeadService service = new LeadService(
                leadRepository,
                userRepository,
                projectRepository,
                projectConfigRepository
        );
        User currentUser = currentEmployeeUser();
        Project project = selectedProject();
        CreateLeadRequest request = createLeadRequest(100L, 200L);

        authenticateAs("employee@example.com");
        when(userRepository.findByEmail("employee@example.com")).thenReturn(Optional.of(currentUser));
        when(projectRepository.findById(100L)).thenReturn(Optional.of(project));

        assertThatThrownBy(() -> service.createLead(request))
                .isInstanceOf(RuntimeException.class)
                .hasMessage("Selected property not found");
        verify(projectConfigRepository, never()).findByIdAndProjectId(200L, 100L);
        verify(leadRepository, never()).save(any());
    }

    private static void authenticateAs(String email) {
        Authentication authentication = mock(Authentication.class);
        when(authentication.getName()).thenReturn(email);
        when(authentication.isAuthenticated()).thenReturn(true);
        SecurityContextHolder.getContext().setAuthentication(authentication);
    }

    private static User currentAdminUser() {
        return User.builder()
                .id(42L)
                .email("admin@example.com")
                .role(Role.ADMIN)
                .build();
    }

    private static User currentEmployeeUser() {
        return User.builder()
                .id(77L)
                .email("employee@example.com")
                .role(Role.EMPLOYEE)
                .build();
    }

    private static Project selectedProject() {
        return Project.builder()
                .id(100L)
                .uploadedBy(42L)
                .projectName("Skyline Towers")
                .city("Pune")
                .build();
    }

    private static ProjectConfig selectedConfig(Project project) {
        return ProjectConfig.builder()
                .id(200L)
                .project(project)
                .configLabel("2 BHK Premium")
                .price(9500000.0)
                .build();
    }

    private static CreateLeadRequest createLeadRequest(Long projectId, Long configId) {
        CreateLeadRequest request = new CreateLeadRequest();
        request.setCustomerName("Asha Shah");
        request.setPhone("9876543210");
        request.setEmail("asha@example.com");
        request.setProjectId(projectId);
        request.setConfigId(configId);
        return request;
    }
}
