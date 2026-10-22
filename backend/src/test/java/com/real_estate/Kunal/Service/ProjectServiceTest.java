package com.real_estate.Kunal.Service;

import com.real_estate.Kunal.DTO.ProjectConfigDTO;
import com.real_estate.Kunal.DTO.ProjectRequest;
import com.real_estate.Kunal.DTO.ProjectResponse;
import com.real_estate.Kunal.DTO.SellProjectRequest;
import com.real_estate.Kunal.Entity.Location;
import com.real_estate.Kunal.Entity.Project;
import com.real_estate.Kunal.Entity.ProjectConfig;
import com.real_estate.Kunal.Entity.ProjectUnit;
import com.real_estate.Kunal.Entity.Role;
import com.real_estate.Kunal.Entity.Sale;
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
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.server.ResponseStatusException;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicReference;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.atLeastOnce;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class ProjectServiceTest {

    @AfterEach
    void clearSecurityContext() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void recordSalePersistsBuyerContactAndSubmittedAmount() {
        ProjectRepository projectRepository = mock(ProjectRepository.class);
        ProjectConfigRepository projectConfigRepository = mock(ProjectConfigRepository.class);
        ProjectDocumentRepository projectDocumentRepository = mock(ProjectDocumentRepository.class);
        ProjectUnitRepository projectUnitRepository = mock(ProjectUnitRepository.class);
        SaleRepository saleRepository = mock(SaleRepository.class);
        UserRepository userRepository = mock(UserRepository.class);
        ActivityRepository activityRepository = mock(ActivityRepository.class);
        ProjectService service = newService(
                projectRepository,
                projectConfigRepository,
                projectDocumentRepository,
                projectUnitRepository,
                saleRepository,
                userRepository,
                activityRepository);

        User seller = User.builder()
                .id(7L)
                .name("Admin Seller")
                .email("seller@example.com")
                .role(Role.SUPER_ADMIN)
                .build();
        setAuthenticatedUser(seller, userRepository);

        ProjectConfig config = ProjectConfig.builder()
                .id(11L)
                .configLabel("2 BHK")
                .units(1)
                .price(4400000.0)
                .build();
        Project project = Project.builder()
                .id(10L)
                .projectName("Palm Heights")
                .configs(List.of(config))
                .build();
        config.setProject(project);
        ProjectUnit unit = ProjectUnit.builder()
                .id(99L)
                .projectId(10L)
                .configId(11L)
                .unitLabel("A-101")
                .status("AVAILABLE")
                .build();

        when(projectRepository.findByIdForUpdate(10L)).thenReturn(Optional.of(project));
        when(projectConfigRepository.findByIdAndProjectId(11L, 10L)).thenReturn(Optional.of(config));
        when(projectUnitRepository.findByIdAndProjectIdAndConfigId(99L, 10L, 11L)).thenReturn(Optional.of(unit));
        when(projectUnitRepository.countByConfigIdAndStatus(11L, "SOLD")).thenReturn(0, 1);
        when(projectUnitRepository.findByProjectId(10L)).thenReturn(List.of(unit));
        when(projectUnitRepository.findByConfigId(11L)).thenReturn(List.of(unit));
        when(projectDocumentRepository.findByProjectIdIn(any())).thenReturn(List.of());
        AtomicReference<Sale> savedSale = new AtomicReference<>();
        when(saleRepository.findByProjectIdIn(any())).thenAnswer(invocation ->
                savedSale.get() != null ? List.of(savedSale.get()) : List.of());
        when(userRepository.findAllById(any())).thenReturn(List.of(seller));
        when(saleRepository.save(any(Sale.class))).thenAnswer(invocation -> {
            Sale sale = invocation.getArgument(0);
            sale.setId(123L);
            savedSale.set(sale);
            return sale;
        });

        SellProjectRequest request = new SellProjectRequest();
        request.setConfigurationId(11L);
        request.setUnitId(99L);
        request.setBuyerName("Rahul Patil");
        request.setBuyerPhone("9876543210");
        request.setBuyerEmail("rahul@example.com");
        request.setAmount(5500000.0);

        ProjectResponse response = service.recordSale(10L, request);

        ArgumentCaptor<Sale> captor = ArgumentCaptor.forClass(Sale.class);
        verify(saleRepository).save(captor.capture());
        Sale sale = captor.getValue();
        assertThat(sale.getAmount()).isEqualTo(5500000.0);
        assertThat(sale.getBuyerName()).isEqualTo("Rahul Patil");
        assertThat(sale.getBuyerPhone()).isEqualTo("9876543210");
        assertThat(sale.getBuyerEmail()).isEqualTo("rahul@example.com");
        assertThat(sale.getProjectId()).isEqualTo(10L);
        assertThat(sale.getConfigurationId()).isEqualTo(11L);
        assertThat(sale.getUnitId()).isEqualTo(99L);
        assertThat(response.getSales()).singleElement()
                .satisfies(record -> {
                    assertThat(record.getBuyerPhone()).isEqualTo("9876543210");
                    assertThat(record.getBuyerEmail()).isEqualTo("rahul@example.com");
                });
    }

    @Test
    void recordSaleRejectsBlankBuyerNameOrPhone() {
        ProjectRepository projectRepository = mock(ProjectRepository.class);
        ProjectConfigRepository projectConfigRepository = mock(ProjectConfigRepository.class);
        ProjectDocumentRepository projectDocumentRepository = mock(ProjectDocumentRepository.class);
        ProjectUnitRepository projectUnitRepository = mock(ProjectUnitRepository.class);
        SaleRepository saleRepository = mock(SaleRepository.class);
        UserRepository userRepository = mock(UserRepository.class);
        ProjectService service = newService(
                projectRepository,
                projectConfigRepository,
                projectDocumentRepository,
                projectUnitRepository,
                saleRepository,
                userRepository,
                mock(ActivityRepository.class));

        User seller = User.builder()
                .id(7L)
                .name("Admin Seller")
                .email("seller@example.com")
                .role(Role.SUPER_ADMIN)
                .build();
        setAuthenticatedUser(seller, userRepository);
        when(projectRepository.findByIdForUpdate(10L)).thenReturn(Optional.of(Project.builder().id(10L).build()));

        SellProjectRequest blankName = new SellProjectRequest();
        blankName.setConfigurationId(11L);
        blankName.setUnitId(99L);
        blankName.setBuyerName(" ");
        blankName.setBuyerPhone("9876543210");

        SellProjectRequest blankPhone = new SellProjectRequest();
        blankPhone.setConfigurationId(11L);
        blankPhone.setUnitId(99L);
        blankPhone.setBuyerName("Rahul Patil");
        blankPhone.setBuyerPhone(" ");

        assertThatThrownBy(() -> service.recordSale(10L, blankName))
                .isInstanceOf(ResponseStatusException.class)
                .extracting("statusCode")
                .isEqualTo(HttpStatus.BAD_REQUEST);
        assertThatThrownBy(() -> service.recordSale(10L, blankPhone))
                .isInstanceOf(ResponseStatusException.class)
                .extracting("statusCode")
                .isEqualTo(HttpStatus.BAD_REQUEST);
    }

    @Test
    void createLandListingSuccessfullyPersistsLandSpecificsConfigsAndUnits() {
        ProjectRepository projectRepository = mock(ProjectRepository.class);
        ProjectConfigRepository projectConfigRepository = mock(ProjectConfigRepository.class);
        ProjectDocumentRepository projectDocumentRepository = mock(ProjectDocumentRepository.class);
        ProjectUnitRepository projectUnitRepository = mock(ProjectUnitRepository.class);
        SaleRepository saleRepository = mock(SaleRepository.class);
        UserRepository userRepository = mock(UserRepository.class);
        ActivityRepository activityRepository = mock(ActivityRepository.class);
        LocationRepository locationRepository = mock(LocationRepository.class);

        ProjectService service = newService(
                projectRepository,
                projectConfigRepository,
                projectDocumentRepository,
                projectUnitRepository,
                saleRepository,
                userRepository,
                activityRepository,
                locationRepository);

        User superadmin = User.builder()
                .id(1L)
                .name("Super Admin")
                .email("admin@example.com")
                .role(Role.SUPER_ADMIN)
                .build();
        setAuthenticatedUser(superadmin, userRepository);

        Location loc = Location.builder()
                .id(5L)
                .city("Pune")
                .area("Wakad")
                .state("Maharashtra")
                .build();
        when(locationRepository.findById(5L)).thenReturn(Optional.of(loc));

        when(projectRepository.save(any(Project.class))).thenAnswer(inv -> {
            Project p = inv.getArgument(0);
            if (p.getId() == null) {
                p.setId(50L);
            }
            return p;
        });
        when(projectRepository.saveAndFlush(any(Project.class))).thenAnswer(inv -> {
            Project p = inv.getArgument(0);
            if (p.getId() == null) {
                p.setId(50L);
            }
            return p;
        });

        AtomicReference<ProjectConfig> savedConfigRef = new AtomicReference<>();
        when(projectConfigRepository.saveAndFlush(any(ProjectConfig.class))).thenAnswer(inv -> {
            ProjectConfig c = inv.getArgument(0);
            c.setId(101L);
            savedConfigRef.set(c);
            return c;
        });

        List<ProjectUnit> savedUnits = new ArrayList<>();
        when(projectUnitRepository.save(any(ProjectUnit.class))).thenAnswer(inv -> {
            ProjectUnit u = inv.getArgument(0);
            u.setId(201L);
            savedUnits.add(u);
            return u;
        });
        when(projectUnitRepository.findByConfigId(101L)).thenAnswer(inv -> savedUnits);

        ProjectConfigDTO plotConfig = ProjectConfigDTO.builder()
                .configLabel("Plot 1")
                .propertyType("Plot")
                .listingType("Sale")
                .units(1)
                .unitsSold(0)
                .price(3500000.0)
                .floorNo("0")
                .flatType("Plot")
                .carpetAreaSqft(2400.0)
                .unitLabels(List.of("Plot 1"))
                .build();

        ProjectRequest request = new ProjectRequest();
        request.setPropertyCategory("Land");
        request.setPropertySubcategory("Residential Plot");
        request.setLocationId(5L);
        request.setPlotNumber("Plot 101");
        request.setSurveyNumber("SN-45");
        request.setPlotDimensions("60 x 40 ft");
        request.setOwnershipType("Freehold");
        request.setTotalLandArea(2400.0);
        request.setTotalLandAreaUnit("sq_ft");
        request.setAddress("Near High Street");
        request.setPrice(3500000.0);
        request.setConfigs(List.of(plotConfig));

        ProjectResponse response = service.createProject(request);

        assertThat(response).isNotNull();
        assertThat(response.getPropertyCategory()).isEqualTo("Land");
        assertThat(response.getPropertySubcategory()).isEqualTo("Residential Plot");
        assertThat(response.getPlotNumber()).isEqualTo("Plot 101");
        assertThat(response.getSurveyNumber()).isEqualTo("SN-45");
        assertThat(response.getPlotDimensions()).isEqualTo("60 x 40 ft");
        assertThat(response.getOwnershipType()).isEqualTo("Freehold");
        assertThat(response.getTotalLandArea()).isEqualTo(2400.0);
        assertThat(response.getTotalLandAreaUnit()).isEqualTo("sq_ft");
        assertThat(response.getCity()).isEqualTo("Pune");
        assertThat(response.getArea()).isEqualTo("Wakad");

        verify(projectUnitRepository, atLeastOnce()).save(any(ProjectUnit.class));
        assertThat(savedUnits).hasSize(1);
        assertThat(savedUnits.get(0).getConfigId()).isEqualTo(101L);
        assertThat(savedUnits.get(0).getUnitLabel()).isEqualTo("Plot 1");
    }

    @Test
    void createLandListingDerivesFallbackNameWhenBlank() {
        ProjectRepository projectRepository = mock(ProjectRepository.class);
        LocationRepository locationRepository = mock(LocationRepository.class);
        UserRepository userRepository = mock(UserRepository.class);

        ProjectService service = newService(
                projectRepository,
                mock(ProjectConfigRepository.class),
                mock(ProjectDocumentRepository.class),
                mock(ProjectUnitRepository.class),
                mock(SaleRepository.class),
                userRepository,
                mock(ActivityRepository.class),
                locationRepository);

        User superadmin = User.builder()
                .id(1L)
                .name("Super Admin")
                .email("admin@example.com")
                .role(Role.SUPER_ADMIN)
                .build();
        setAuthenticatedUser(superadmin, userRepository);

        Location loc = Location.builder().id(5L).city("Pune").area("Baner").state("Maharashtra").build();
        when(locationRepository.findById(5L)).thenReturn(Optional.of(loc));

        ArgumentCaptor<Project> captor = ArgumentCaptor.forClass(Project.class);
        when(projectRepository.save(captor.capture())).thenAnswer(inv -> {
            Project p = inv.getArgument(0);
            p.setId(60L);
            return p;
        });

        ProjectRequest request = new ProjectRequest();
        request.setPropertyCategory("Land");
        request.setLocationId(5L);
        request.setPlotNumber("99");
        request.setAddress("Baner Road");

        ProjectResponse response = service.createProject(request);

        assertThat(response.getProjectName()).isEqualTo("Plot 99");
    }

    private ProjectService newService(
            ProjectRepository projectRepository,
            ProjectConfigRepository projectConfigRepository,
            ProjectDocumentRepository projectDocumentRepository,
            ProjectUnitRepository projectUnitRepository,
            SaleRepository saleRepository,
            UserRepository userRepository,
            ActivityRepository activityRepository) {
        return newService(
                projectRepository,
                projectConfigRepository,
                projectDocumentRepository,
                projectUnitRepository,
                saleRepository,
                userRepository,
                activityRepository,
                mock(LocationRepository.class));
    }

    private ProjectService newService(
            ProjectRepository projectRepository,
            ProjectConfigRepository projectConfigRepository,
            ProjectDocumentRepository projectDocumentRepository,
            ProjectUnitRepository projectUnitRepository,
            SaleRepository saleRepository,
            UserRepository userRepository,
            ActivityRepository activityRepository,
            LocationRepository locationRepository) {
        return new ProjectService(
                projectRepository,
                projectConfigRepository,
                projectDocumentRepository,
                projectUnitRepository,
                saleRepository,
                mock(SubscriptionRepository.class),
                mock(BrokerLocationRepository.class),
                locationRepository != null ? locationRepository : mock(LocationRepository.class),
                mock(AreaRepository.class),
                userRepository,
                activityRepository,
                mock(SignedMediaUrlService.class),
                mock(ObjectStorageService.class),
                mock(LocationService.class));
    }

    private void setAuthenticatedUser(User user, UserRepository userRepository) {
        Authentication authentication = mock(Authentication.class);
        when(authentication.isAuthenticated()).thenReturn(true);
        when(authentication.getPrincipal()).thenReturn(user.getEmail());
        when(authentication.getName()).thenReturn(user.getEmail());
        SecurityContextHolder.getContext().setAuthentication(authentication);
        when(userRepository.findByEmail(user.getEmail())).thenReturn(Optional.of(user));
    }
}
