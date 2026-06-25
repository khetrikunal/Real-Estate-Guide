package com.real_estate.Kunal.Service;

import com.real_estate.Kunal.DTO.ProjectResponse;
import com.real_estate.Kunal.DTO.SellProjectRequest;
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

import java.util.List;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicReference;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
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

    private ProjectService newService(
            ProjectRepository projectRepository,
            ProjectConfigRepository projectConfigRepository,
            ProjectDocumentRepository projectDocumentRepository,
            ProjectUnitRepository projectUnitRepository,
            SaleRepository saleRepository,
            UserRepository userRepository,
            ActivityRepository activityRepository) {
        return new ProjectService(
                projectRepository,
                projectConfigRepository,
                projectDocumentRepository,
                projectUnitRepository,
                saleRepository,
                mock(SubscriptionRepository.class),
                mock(BrokerLocationRepository.class),
                mock(LocationRepository.class),
                mock(AreaRepository.class),
                userRepository,
                activityRepository,
                mock(SignedMediaUrlService.class),
                mock(ObjectStorageService.class));
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
