package com.real_estate.Kunal.Service;

import com.real_estate.Kunal.DTO.CreateUserRequest;
import com.real_estate.Kunal.Entity.Role;
import com.real_estate.Kunal.Entity.User;
import com.real_estate.Kunal.Repository.CustomCityRepository;
import com.real_estate.Kunal.Repository.EmployeeRepository;
import com.real_estate.Kunal.Repository.LocationRepository;
import com.real_estate.Kunal.Repository.PaymentRepository;
import com.real_estate.Kunal.Repository.ProjectRepository;
import com.real_estate.Kunal.Repository.UserKycDocumentRepository;
import com.real_estate.Kunal.Repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.server.ResponseStatusException;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class UserServiceTest {

    @Test
    void createAdminRejectsIdentityFields() {
        UserRepository userRepository = mock(UserRepository.class);
        when(userRepository.findByEmail("admin@example.com")).thenReturn(Optional.empty());

        CreateUserRequest request = new CreateUserRequest();
        request.setName("Admin User");
        request.setEmail("admin@example.com");
        request.setPhone("9999999999");
        request.setPassword("AdminPass123");
        request.setAadhaarNumber("123456789012");
        request.setPanNumber("ABCDE1234F");

        UserService service = new UserService(
                userRepository,
                mock(PasswordEncoder.class),
                mock(EmployeeRepository.class),
                mock(SubscriptionService.class),
                mock(LocationRepository.class),
                mock(CustomCityRepository.class),
                mock(PaymentService.class),
                mock(PaymentRepository.class),
                mock(ProjectRepository.class),
                mock(UserKycDocumentRepository.class),
                mock(KycDocumentService.class)
        );

        assertThatThrownBy(() -> service.createAdmin(request))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("identity fields are not accepted");
    }

    @Test
    void updateKycStatusRequiresUploadedDocumentsBeforeVerification() {
        UserRepository userRepository = mock(UserRepository.class);
        KycDocumentService kycDocumentService = mock(KycDocumentService.class);
        User user = User.builder()
                .id(10L)
                .role(Role.EMPLOYEE)
                .aadhaarNumber("123456789012")
                .panNumber("ABCPE1234F")
                .build();
        when(userRepository.findById(10L)).thenReturn(Optional.of(user));
        doThrow(new ResponseStatusException(HttpStatus.BAD_REQUEST, "Missing required KYC document: PROFILE_PHOTO"))
                .when(kycDocumentService)
                .ensureUserHasRequiredDocuments(10L);

        UserService service = new UserService(
                userRepository,
                mock(PasswordEncoder.class),
                mock(EmployeeRepository.class),
                mock(SubscriptionService.class),
                mock(LocationRepository.class),
                mock(CustomCityRepository.class),
                mock(PaymentService.class),
                mock(PaymentRepository.class),
                mock(ProjectRepository.class),
                mock(UserKycDocumentRepository.class),
                kycDocumentService
        );

        assertThatThrownBy(() -> service.updateKycStatus(10L, "VERIFIED", 1L, null))
                .isInstanceOf(ResponseStatusException.class)
                .extracting("statusCode")
                .isEqualTo(HttpStatus.BAD_REQUEST);
        verify(kycDocumentService).ensureUserHasRequiredDocuments(10L);
    }
}
