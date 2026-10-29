package com.real_estate.Kunal.Service;

import com.real_estate.Kunal.DTO.ProjectRequest;
import com.real_estate.Kunal.DTO.SellProjectRequest;
import com.real_estate.Kunal.Entity.PlanType;
import com.real_estate.Kunal.Entity.Project;
import com.real_estate.Kunal.Entity.ProjectConfig;
import com.real_estate.Kunal.Entity.ProjectUnit;
import com.real_estate.Kunal.Entity.Role;
import com.real_estate.Kunal.Entity.Subscription;
import com.real_estate.Kunal.Entity.User;
import com.real_estate.Kunal.Repository.ActivityRepository;
import com.real_estate.Kunal.Repository.AreaRepository;
import com.real_estate.Kunal.Repository.BrokerLocationRepository;
import com.real_estate.Kunal.Repository.LocationRepository;
import com.real_estate.Kunal.Repository.ProjectConfigRepository;
import com.real_estate.Kunal.Repository.ProjectDocumentRepository;
import com.real_estate.Kunal.Repository.ProjectRepository;
import com.real_estate.Kunal.Repository.ProjectUnitRepository;
import com.real_estate.Kunal.Repository.SaleRepository;
import com.real_estate.Kunal.Repository.SubscriptionRepository;
import com.real_estate.Kunal.Repository.UserRepository;
import com.real_estate.Kunal.Security.SignedMediaUrlService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.atLeastOnce;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class ProjectServiceAccessTest {

    private final ProjectRepository projectRepository = mock(ProjectRepository.class);
    private final ProjectConfigRepository projectConfigRepository = mock(ProjectConfigRepository.class);
    private final ProjectDocumentRepository projectDocumentRepository = mock(ProjectDocumentRepository.class);
    private final ProjectUnitRepository projectUnitRepository = mock(ProjectUnitRepository.class);
    private final SaleRepository saleRepository = mock(SaleRepository.class);
    private final SubscriptionRepository subscriptionRepository = mock(SubscriptionRepository.class);
    private final BrokerLocationRepository brokerLocationRepository = mock(BrokerLocationRepository.class);
    private final LocationRepository locationRepository = mock(LocationRepository.class);
    private final AreaRepository areaRepository = mock(AreaRepository.class);
    private final UserRepository userRepository = mock(UserRepository.class);
    private final ActivityRepository activityRepository = mock(ActivityRepository.class);
    private final LocationService locationService = mock(LocationService.class);
    private final ProjectService service = new ProjectService(
            projectRepository,
            projectConfigRepository,
            projectDocumentRepository,
            projectUnitRepository,
            saleRepository,
            subscriptionRepository,
            brokerLocationRepository,
            locationRepository,
            areaRepository,
            userRepository,
            activityRepository,
            mock(SignedMediaUrlService.class),
            mock(ObjectStorageService.class),
            locationService);

    @BeforeEach
    void setUpLocationService() {
        when(locationService.resolveUserCityName(any())).thenAnswer(inv -> {
            User u = inv.getArgument(0);
            return u != null ? u.getAssignedCity() : null;
        });
        when(locationService.resolveUserAreaName(any())).thenAnswer(inv -> {
            User u = inv.getArgument(0);
            return u != null ? u.getAssignedArea() : null;
        });
    }

    @AfterEach
    void clearSecurityContext() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void locationBasedSubadminCanListCreateAndSellAssignedAreaProjects() {
        User subadmin = subadmin("location@example.com", "location_based", "Baramati", "MIDC", LocalDate.now().plusDays(7));
        setAuthenticatedUser(subadmin);
        activeSubscription(subadmin);
        responseDependencies(subadmin);

        Project assignedProject = project(10L, "Allowed", "Baramati", "MIDC");
        when(projectRepository.findAll()).thenReturn(List.of(assignedProject));
        when(projectRepository.findByUploadedBy(subadmin.getId())).thenReturn(List.of(assignedProject));
        when(projectRepository.findByCityIgnoreCaseAndAreaIgnoreCase("Baramati", "MIDC"))
                .thenReturn(List.of(assignedProject));
        when(projectRepository.save(any(Project.class))).thenAnswer(invocation -> {
            Project saved = invocation.getArgument(0);
            if (saved.getId() == null) {
                saved.setId(20L);
            }
            return saved;
        });
        saleDependencies(assignedProject);

        assertThat(service.getProjectsByCity("Baramati", "MIDC"))
                .extracting("projectName")
                .containsExactly("Allowed");

        service.createProject(projectRequest("Allowed Create", "Baramati", "MIDC"));
        verify(projectRepository).save(any(Project.class));

        service.recordSale(10L, sellRequest());
        verify(projectUnitRepository, atLeastOnce()).save(any(ProjectUnit.class));
    }

    @Test
    void locationBasedSubadminAssignedToCityCanCreateProjectWithoutArea() {
        User subadmin = subadmin("city-only@example.com", "location_based", "Baramati", null, LocalDate.now().plusDays(7));
        setAuthenticatedUser(subadmin);
        activeSubscription(subadmin);
        responseDependencies(subadmin);

        Project cityProject = project(10L, "City Project", "Baramati", null);
        when(projectRepository.findAll()).thenReturn(List.of(cityProject));
        when(projectRepository.findByUploadedBy(subadmin.getId())).thenReturn(List.of(cityProject));
        when(projectRepository.findByCityIgnoreCase("Baramati")).thenReturn(List.of(cityProject));
        when(projectRepository.save(any(Project.class))).thenAnswer(invocation -> {
            Project saved = invocation.getArgument(0);
            saved.setId(21L);
            return saved;
        });

        assertThat(service.getProjectsByCity("Baramati", null))
                .extracting("projectName")
                .containsExactly("City Project");

        service.createProject(projectRequest("City Only Create", "Baramati", null));
        verify(projectRepository).save(any(Project.class));
    }

    @Test
    void subadminAssignedToAllLocationsCanSeeOnlyOwnProjectsAndCreateAnyCity() {
        User subadmin = subadmin("all-locations@example.com", "location_based", "ALL", null, LocalDate.now().plusDays(7));
        setAuthenticatedUser(subadmin);
        activeSubscription(subadmin);
        responseDependencies(subadmin);

        when(projectRepository.findByUploadedByAndIsDeletedFalse(subadmin.getId())).thenReturn(List.of(
                project(10L, "Baramati Project", "Baramati", "MIDC"),
                project(11L, "Pune Project", "Pune", "Kasba")
        ));
        when(projectRepository.save(any(Project.class))).thenAnswer(invocation -> {
            Project saved = invocation.getArgument(0);
            saved.setId(22L);
            return saved;
        });

        assertThat(service.getAllProjects())
                .extracting("projectName")
                .containsExactly("Baramati Project", "Pune Project");

        service.createProject(projectRequest("Pune Create", "Pune", null));
        verify(projectRepository).save(any(Project.class));
    }

    @Test
    void locationBasedSubadminAssignedToMultipleCitiesCanSeeOnlyOwnProjectsInThoseCities() {
        User subadmin = subadmin("multi-city@example.com", "location_based", "Baramati,Pune", null, LocalDate.now().plusDays(7));
        setAuthenticatedUser(subadmin);
        activeSubscription(subadmin);
        responseDependencies(subadmin);

        when(projectRepository.findByUploadedByAndIsDeletedFalse(subadmin.getId())).thenReturn(List.of(
                project(10L, "Baramati Project", "Baramati", "MIDC"),
                project(11L, "Pune Project", "Pune", "Kasba")
        ));

        assertThat(service.getAllProjects())
                .extracting("projectName")
                .containsExactly("Baramati Project", "Pune Project");
    }

    @Test
    void locationBasedSubadminCannotListCreateOrSellOutsideAssignedCityOrArea() {
        User subadmin = subadmin("location@example.com", "location_based", "Baramati", "MIDC", LocalDate.now().plusDays(7));
        setAuthenticatedUser(subadmin);
        activeSubscription(subadmin);

        assertForbidden(() -> service.getProjectsByCity("Pune", "MIDC"));
        assertForbidden(() -> service.getProjectsByCity("Baramati", "Kasba"));
        assertForbidden(() -> service.createProject(projectRequest("Wrong City", "Pune", "MIDC")));
        assertForbidden(() -> service.createProject(projectRequest("Wrong Area", "Baramati", "Kasba")));

        when(projectRepository.findByIdForUpdate(10L))
                .thenReturn(Optional.of(projectWithUploader(10L, "Foreign Project", "Baramati", "MIDC", 2L)));
        assertForbidden(() -> service.recordSale(10L, sellRequest()));
    }

    @Test
    void fullSubadminCanListCreateAndSellAnyCityOrAreaWhileActive() {
        User subadmin = subadmin("full@example.com", "full", "Baramati", "MIDC", LocalDate.now().plusDays(7));
        setAuthenticatedUser(subadmin);
        activeSubscription(subadmin);
        responseDependencies(subadmin);

        Project puneProject = project(10L, "Pune Project", "Pune", "Kasba");
        when(projectRepository.findByUploadedBy(subadmin.getId())).thenReturn(List.of(puneProject));
        when(projectRepository.findByCityIgnoreCaseAndAreaIgnoreCase("Pune", "Kasba"))
                .thenReturn(List.of(puneProject));
        when(projectRepository.save(any(Project.class))).thenAnswer(invocation -> {
            Project saved = invocation.getArgument(0);
            if (saved.getId() == null) {
                saved.setId(20L);
            }
            return saved;
        });
        saleDependencies(puneProject);

        assertThat(service.getProjectsByCity("Pune", "Kasba"))
                .extracting("projectName")
                .containsExactly("Pune Project");
        service.createProject(projectRequest("Pune Create", "Pune", "Kasba"));
        service.recordSale(10L, sellRequest());
    }

    @Test
    void expiredSubadminCannotListCreateOrSellProjects() {
        User subadmin = subadmin("expired@example.com", "full", "Baramati", "MIDC", LocalDate.now().minusDays(1));
        setAuthenticatedUser(subadmin);

        assertPaymentRequired(() -> service.getProjectsByCity("Baramati", "MIDC"));
        assertPaymentRequired(() -> service.createProject(projectRequest("Expired Create", "Baramati", "MIDC")));

        when(projectRepository.findByIdForUpdate(10L))
                .thenReturn(Optional.of(project(10L, "Allowed", "Baramati", "MIDC")));
        assertPaymentRequired(() -> service.recordSale(10L, sellRequest()));
    }

    @Test
    void expiredSubadminCannotUseBroadProjectListingPaths() {
        User subadmin = subadmin("expired-list@example.com", "full", "Baramati", "MIDC", LocalDate.now().minusDays(1));
        setAuthenticatedUser(subadmin);

        assertPaymentRequired(service::getAllProjects);
        assertPaymentRequired(() -> service.searchProjects(null, null, null, null, List.of()));
        assertPaymentRequired(() -> service.getProjectsByUploader(subadmin.getId()));
    }

    @Test
    void recordSaleRejectsSoldOutConfigurationBeforeSellingUnit() {
        User subadmin = subadmin("seller@example.com", "location_based", "Baramati", "MIDC", LocalDate.now().plusDays(7));
        setAuthenticatedUser(subadmin);
        activeSubscription(subadmin);

        Project project = project(10L, "Allowed", "Baramati", "MIDC");
        ProjectConfig config = ProjectConfig.builder()
                .id(100L)
                .project(project)
                .configLabel("2 BHK")
                .units(1)
                .unitsSold(1)
                .price(5000000.0)
                .build();
        project.setConfigs(List.of(config));
        when(projectRepository.findByIdForUpdate(project.getId())).thenReturn(Optional.of(project));
        when(projectConfigRepository.findByIdAndProjectId(config.getId(), project.getId())).thenReturn(Optional.of(config));
        when(projectUnitRepository.countByConfigIdAndStatus(config.getId(), "SOLD")).thenReturn(1);

        assertThatThrownBy(() -> service.recordSale(10L, sellRequest()))
                .isInstanceOf(ResponseStatusException.class)
                .extracting("statusCode")
                .isEqualTo(HttpStatus.CONFLICT);
    }

    private void activeSubscription(User user) {
        when(subscriptionRepository.findByUserIdAndStatus(user.getId(), "ACTIVE"))
                .thenReturn(Optional.of(Subscription.builder()
                        .userId(user.getId())
                        .planType(PlanType.ALL)
                        .status("ACTIVE")
                        .endDate(LocalDate.now().plusDays(7))
                        .build()));
    }

    private void responseDependencies(User user) {
        when(projectDocumentRepository.findByProjectIdIn(any())).thenReturn(List.of());
        when(saleRepository.findByProjectIdIn(any())).thenReturn(List.of());
        when(userRepository.findAllById(any())).thenReturn(List.of(user));
        when(projectUnitRepository.findByConfigId(anyLong())).thenReturn(List.of());
    }

    private void saleDependencies(Project project) {
        ProjectConfig config = ProjectConfig.builder()
                .id(100L)
                .project(project)
                .configLabel("2 BHK")
                .units(1)
                .price(5000000.0)
                .build();
        ProjectUnit unit = ProjectUnit.builder()
                .id(200L)
                .projectId(project.getId())
                .configId(config.getId())
                .unitLabel("A-101")
                .status("AVAILABLE")
                .build();
        project.setConfigs(List.of(config));
        when(projectRepository.findByIdForUpdate(project.getId())).thenReturn(Optional.of(project));
        when(projectConfigRepository.findByIdAndProjectId(config.getId(), project.getId())).thenReturn(Optional.of(config));
        when(projectUnitRepository.findByIdAndProjectIdAndConfigId(unit.getId(), project.getId(), config.getId()))
                .thenReturn(Optional.of(unit));
        when(projectUnitRepository.countByConfigIdAndStatus(config.getId(), "SOLD")).thenReturn(0, 1);
        when(projectUnitRepository.findByProjectId(project.getId())).thenReturn(List.of(unit));
        when(projectRepository.save(project)).thenReturn(project);
    }

    private ProjectRequest projectRequest(String name, String city, String area) {
        ProjectRequest request = new ProjectRequest();
        request.setProjectName(name);
        request.setCity(city);
        request.setArea(area);
        request.setState("Maharashtra");
        request.setLocationId(1L);
        return request;
    }

    private SellProjectRequest sellRequest() {
        SellProjectRequest request = new SellProjectRequest();
        request.setConfigurationId(100L);
        request.setUnitId(200L);
        request.setBuyerName("Buyer");
        request.setBuyerPhone("9999999999");
        return request;
    }

    private Project project(Long id, String name, String city, String area) {
        return projectWithUploader(id, name, city, area, 1L);
    }

    private Project projectWithUploader(Long id, String name, String city, String area, Long uploaderId) {
        return Project.builder()
                .id(id)
                .projectName(name)
                .city(city)
                .area(area)
                .state("Maharashtra")
                .locationId(1L)
                .uploadedBy(uploaderId)
                .build();
    }

    private User subadmin(String email, String subscriptionType, String city, String area, LocalDate expiresAt) {
        return User.builder()
                .id(1L)
                .name("Sub Admin")
                .email(email)
                .role(Role.SUB_ADMIN)
                .subscriptionType(subscriptionType)
                .assignedCity(city)
                .assignedArea(area)
                .subscriptionExpiresAt(expiresAt)
                .build();
    }

    private void setAuthenticatedUser(User user) {
        Authentication authentication = mock(Authentication.class);
        when(authentication.isAuthenticated()).thenReturn(true);
        when(authentication.getPrincipal()).thenReturn(user.getEmail());
        when(authentication.getName()).thenReturn(user.getEmail());
        SecurityContextHolder.getContext().setAuthentication(authentication);
        when(userRepository.findByEmail(user.getEmail())).thenReturn(Optional.of(user));
    }

    private void assertForbidden(ThrowingCall call) {
        assertThatThrownBy(call::invoke)
                .isInstanceOf(ResponseStatusException.class)
                .extracting("statusCode")
                .isEqualTo(HttpStatus.FORBIDDEN);
    }

    private void assertPaymentRequired(ThrowingCall call) {
        assertThatThrownBy(call::invoke)
                .isInstanceOf(ResponseStatusException.class)
                .extracting("statusCode")
                .isEqualTo(HttpStatus.PAYMENT_REQUIRED);
    }

    @FunctionalInterface
    private interface ThrowingCall {
        void invoke();
    }
}
