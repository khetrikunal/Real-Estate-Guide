package com.real_estate.Kunal.Security;

import com.real_estate.Kunal.Entity.*;
import com.real_estate.Kunal.Repository.*;
import com.real_estate.Kunal.util.JwtUtil;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDate;
import java.util.Map;
import java.util.UUID;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class BackendSecurityIntegrationTest {
    @Autowired MockMvc mvc;
    @Autowired UserRepository users;
    @Autowired ProjectRepository projects;
    @Autowired JwtUtil jwt;
    @Autowired OtpRecordRepository otps;
    @Autowired com.real_estate.Kunal.Service.PasswordRecoveryService recovery;
    @Autowired org.springframework.security.crypto.password.PasswordEncoder encoder;

    private User employee;
    private String token;

    @BeforeEach
    void setup() {
        employee = users.save(User.builder().name("Member").email(UUID.randomUUID() + "@example.com")
                .role(Role.EMPLOYEE).password("hash-must-never-leak").aadhaarNumber("sensitive-id")
                .panNumber("sensitive-pan").fcmToken("private-fcm").build());
        token = jwt.generateToken(employee.getEmail(), employee.getRole().name(), employee.getId(), 0L);
    }

    @Test
    void publicAndEmployeeCannotRegisterPrivilegedAccounts() throws Exception {
        String body = "{\"name\":\"Attacker\",\"email\":\"new@example.com\",\"password\":\"ValidPassword123!\",\"role\":\"SUPER_ADMIN\"}";
        mvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().is4xxClientError());
        mvc.perform(post("/api/auth/register").header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON).content(body)).andExpect(status().isForbidden());
        assertThat(users.findByEmail("new@example.com")).isEmpty();
    }

    @Test
    void sessionResponseExcludesCredentialsAndIdentityDocuments() throws Exception {
        mvc.perform(get("/api/auth/me").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk()).andExpect(jsonPath("$.id").value(employee.getId()))
                .andExpect(jsonPath("$.password").doesNotExist())
                .andExpect(jsonPath("$.aadhaarNumber").doesNotExist())
                .andExpect(jsonPath("$.panNumber").doesNotExist())
                .andExpect(jsonPath("$.fcmToken").doesNotExist())
                .andExpect(jsonPath("$.tokenVersion").doesNotExist());
    }

    @Test
    void resetTokenCannotOpenSessionAndOldAccessTokenIsRevoked() throws Exception {
        String reset = jwt.generateTokenWithClaims(employee.getEmail(), Map.of("purpose", "reset_password", "tokenVersion", 0), 60000);
        mvc.perform(get("/api/auth/me").header("Authorization", "Bearer " + reset))
                .andExpect(status().is4xxClientError());
        employee.setTokenVersion(1L);
        users.saveAndFlush(employee);
        mvc.perform(get("/api/auth/me").header("Authorization", "Bearer " + token))
                .andExpect(status().is4xxClientError());
    }

    @Test
    void hierarchyCannotAccessOrMutateAnotherOwnersProject() throws Exception {
        User owner = users.save(User.builder().name("Owner").email(UUID.randomUUID() + "@example.com").role(Role.EMPLOYEE).build());
        Project project = projects.save(Project.builder().projectName("Private").uploadedBy(owner.getId()).build());
        mvc.perform(get("/api/properties/" + project.getId() + "/hierarchy").header("Authorization", "Bearer " + token))
                .andExpect(status().isForbidden());
        mvc.perform(post("/api/properties/" + project.getId() + "/buildings").header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON).content("{\"name\":\"Intruder\",\"totalFloors\":1}"))
                .andExpect(status().isForbidden());
    }

    @Test
    void unitDownloadWithoutSignatureIsForbidden() throws Exception {
        mvc.perform(get("/api/properties/1/units/2/documents/3/download"))
                .andExpect(status().isForbidden());
    }

    @Test
    void employeeCannotActivateOrReadOtherUsersSubscription() throws Exception {
        mvc.perform(post("/api/subscription/subscribe").header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON).content("{\"userId\":1,\"planType\":\"ALL\",\"price\":0}"))
                .andExpect(status().isForbidden());
        mvc.perform(get("/api/subscription/status/999999").header("Authorization", "Bearer " + token))
                .andExpect(status().isForbidden());
    }

    @Test
    void ownerCanManageHierarchyAndReadOwnSubscription() throws Exception {
        Project project = projects.save(Project.builder().projectName("Own property").uploadedBy(employee.getId()).build());
        mvc.perform(post("/api/properties/" + project.getId() + "/buildings").header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON).content("{\"name\":\"Owner tower\",\"totalFloors\":1}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.name").value("Owner tower"));
        mvc.perform(get("/api/subscription/status/" + employee.getId()).header("Authorization", "Bearer " + token))
                .andExpect(status().isOk());
    }

    @Test
    void superAdminCanCreateAccountThroughProtectedRegistration() throws Exception {
        employee.setRole(Role.SUPER_ADMIN);
        users.saveAndFlush(employee);
        String adminToken = jwt.generateToken(employee.getEmail(), "SUPER_ADMIN", employee.getId(), 0L);
        mvc.perform(post("/api/auth/register").header("Authorization", "Bearer " + adminToken)
                .contentType(MediaType.APPLICATION_JSON).content("{\"name\":\"Managed\",\"email\":\"managed@example.com\",\"password\":\"ManagedPassword123!\",\"role\":\"EMPLOYEE\"}"))
                .andExpect(status().isOk());
        assertThat(users.findByEmail("managed@example.com").orElseThrow().getRole()).isEqualTo(Role.EMPLOYEE);
    }

    @Test
    @Transactional(propagation = org.springframework.transaction.annotation.Propagation.NOT_SUPPORTED)
    void wrongOtpAttemptsAreCommittedAndLockOutAfterFiveFailures() {
        OtpRecord record = otps.saveAndFlush(OtpRecord.builder().email(employee.getEmail())
                .purpose("forgot_password").otpHash(encoder.encode("123456"))
                .expiresAt(java.time.LocalDateTime.now().plusMinutes(5)).build());
        var request = new com.real_estate.Kunal.DTO.ForgotPasswordVerifyOtpRequest();
        request.setEmail(employee.getEmail());
        request.setOtp("999999");
        try {
            for (int i = 1; i <= 5; i++) {
                org.assertj.core.api.Assertions.assertThatThrownBy(() -> recovery.verifyOtp(request))
                        .isInstanceOf(org.springframework.web.server.ResponseStatusException.class);
                assertThat(otps.findById(record.getId()).orElseThrow().getAttempts()).isEqualTo(i);
            }
            assertThat(otps.findById(record.getId()).orElseThrow().getIsUsed()).isTrue();
        } finally {
            otps.deleteById(record.getId());
            users.deleteById(employee.getId());
        }
    }

    @Test
    void changingPasswordRevokesPreviouslyIssuedAccessTokens() throws Exception {
        employee.setPassword(encoder.encode("OldPassword123!"));
        users.saveAndFlush(employee);
        var request = new com.real_estate.Kunal.DTO.ChangePasswordRequest();
        request.setCurrentPassword("OldPassword123!");
        request.setNewPassword("NewPassword123!");
        request.setConfirmPassword("NewPassword123!");
        recovery.changePassword(employee.getEmail(), request);
        mvc.perform(get("/api/auth/me").header("Authorization", "Bearer " + token))
                .andExpect(status().is4xxClientError());
    }
}
