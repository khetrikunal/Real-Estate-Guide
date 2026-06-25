package com.real_estate.Kunal.Service;

import com.real_estate.Kunal.DTO.SaleRecordRequest;
import com.real_estate.Kunal.Entity.Project;
import com.real_estate.Kunal.Entity.Role;
import com.real_estate.Kunal.Entity.Sale;
import com.real_estate.Kunal.Entity.User;
import com.real_estate.Kunal.Repository.ProjectRepository;
import com.real_estate.Kunal.Repository.SaleRepository;
import com.real_estate.Kunal.Repository.UserRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class SalesServiceTest {

    @AfterEach
    void clearSecurityContext() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void recordSalePersistsBuyerDetailsProjectUnitAndSellerRole() {
        SaleRepository saleRepository = mock(SaleRepository.class);
        UserRepository userRepository = mock(UserRepository.class);
        ProjectRepository projectRepository = mock(ProjectRepository.class);
        SalesService service = new SalesService(saleRepository, userRepository, projectRepository);

        Authentication authentication = mock(Authentication.class);
        when(authentication.isAuthenticated()).thenReturn(true);
        when(authentication.getPrincipal()).thenReturn("seller@example.com");
        when(authentication.getName()).thenReturn("seller@example.com");
        SecurityContextHolder.getContext().setAuthentication(authentication);

        User seller = User.builder()
                .id(7L)
                .name("Subadmin Seller")
                .email("seller@example.com")
                .role(Role.SUB_ADMIN)
                .build();
        Project project = Project.builder()
                .id(10L)
                .projectName("Palm Heights")
                .uploadedBy(7L)
                .build();
        when(userRepository.findByEmail("seller@example.com")).thenReturn(Optional.of(seller));
        when(projectRepository.findById(10L)).thenReturn(Optional.of(project));
        when(saleRepository.save(any(Sale.class))).thenAnswer(invocation -> invocation.getArgument(0));

        SaleRecordRequest request = new SaleRecordRequest();
        request.setProjectId(10L);
        request.setUnitId(99L);
        request.setBuyerName("Rahul Patil");
        request.setBuyerPhone("9876543210");
        request.setBuyerEmail("rahul@example.com");
        request.setAmount(5500000.0);

        Sale saved = service.recordSale(request);

        ArgumentCaptor<Sale> captor = ArgumentCaptor.forClass(Sale.class);
        verify(saleRepository).save(captor.capture());
        Sale sale = captor.getValue();
        assertThat(saved).isSameAs(sale);
        assertThat(sale.getBuyerName()).isEqualTo("Rahul Patil");
        assertThat(sale.getBuyerPhone()).isEqualTo("9876543210");
        assertThat(sale.getBuyerEmail()).isEqualTo("rahul@example.com");
        assertThat(sale.getAmount()).isEqualTo(5500000.0);
        assertThat(sale.getProjectId()).isEqualTo(10L);
        assertThat(sale.getProjectName()).isEqualTo("Palm Heights");
        assertThat(sale.getUnitId()).isEqualTo(99L);
        assertThat(sale.getSoldByRole()).isEqualTo("SUB_ADMIN");
    }

    @Test
    void recordSaleRejectsBlankBuyerNameOrPhone() {
        SalesService service = new SalesService(mock(SaleRepository.class), mock(UserRepository.class), mock(ProjectRepository.class));

        SaleRecordRequest blankName = new SaleRecordRequest();
        blankName.setProjectId(10L);
        blankName.setUnitId(99L);
        blankName.setBuyerName(" ");
        blankName.setBuyerPhone("9876543210");

        SaleRecordRequest blankPhone = new SaleRecordRequest();
        blankPhone.setProjectId(10L);
        blankPhone.setUnitId(99L);
        blankPhone.setBuyerName("Rahul Patil");
        blankPhone.setBuyerPhone(" ");

        assertThatThrownBy(() -> service.recordSale(blankName))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("buyerName is required");
        assertThatThrownBy(() -> service.recordSale(blankPhone))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("buyerPhone is required");
    }
}
