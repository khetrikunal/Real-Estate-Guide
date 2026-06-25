package com.real_estate.Kunal.Service;

import java.util.List;
import java.time.LocalDateTime;

import org.springframework.stereotype.Service;
import org.springframework.security.crypto.password.PasswordEncoder;

import com.real_estate.Kunal.DTO.EmployeeRequest;
import com.real_estate.Kunal.Entity.Employee;
import com.real_estate.Kunal.Entity.Role;
import com.real_estate.Kunal.Entity.User;
import com.real_estate.Kunal.Repository.EmployeeRepository;
import com.real_estate.Kunal.Repository.UserRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class EmployeeService {

    private final EmployeeRepository employeeRepository;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public Employee createEmployee(EmployeeRequest request){

        if (request.getEmail() == null || request.getEmail().isBlank()) {
            throw new IllegalArgumentException("email is required");
        }

        final String normalizedEmail = request.getEmail().trim().toLowerCase();
        requireKyc(request.getAadhaarNumber(), request.getPanNumber());

        User user = userRepository.findByEmail(normalizedEmail)
                .map(existing -> {
                    if (request.getName() != null && !request.getName().isBlank()) {
                        existing.setName(request.getName().trim());
                    }
                    if (request.getPhone() != null) {
                        existing.setPhone(request.getPhone().trim());
                    }
                    if (request.getAdminId() != null) {
                        existing.setAddedBy(request.getAdminId());
                    }
                    if (existing.getRole() == null) {
                        existing.setRole(Role.EMPLOYEE);
                    }
                    if (existing.getSignupSource() == null || existing.getSignupSource().isBlank()) {
                        existing.setSignupSource("MANUAL");
                    }
                    existing.setProfilePhotoUrl(blankToNull(request.getProfilePhotoUrl()));
                    existing.setAadhaarNumber(blankToNull(request.getAadhaarNumber()));
                    String normalizedPan = blankToNull(request.getPanNumber());
                    existing.setPanNumber(normalizedPan != null ? normalizedPan.toUpperCase() : null);
                    existing.setKycStatus("PENDING");
                    return userRepository.save(existing);
                })
                .orElseGet(() -> userRepository.save(User.builder()
                        .name(request.getName())
                        .email(normalizedEmail)
                        .phone(request.getPhone())
                        .password(passwordEncoder.encode(requireProvisionedPassword(request.getPassword())))
                        .role(Role.EMPLOYEE)
                        .addedBy(request.getAdminId())
                        .signupSource("MANUAL")
                        .profilePhotoUrl(blankToNull(request.getProfilePhotoUrl()))
                        .aadhaarNumber(blankToNull(request.getAadhaarNumber()))
                        .panNumber(normalizedPan(request.getPanNumber()))
                        .kycStatus("PENDING")
                        .build()));

        Employee employee = employeeRepository.findByEmail(normalizedEmail)
                .map(existing -> {
                    if (request.getName() != null && !request.getName().isBlank()) {
                        existing.setName(request.getName().trim());
                    }
                    if (request.getPhone() != null) {
                        existing.setPhone(request.getPhone().trim());
                    }
                    if (request.getAdminId() != null) {
                        existing.setAdminId(request.getAdminId());
                    }
                    return employeeRepository.save(existing);
                })
                .orElseGet(() -> {
                    long count = employeeRepository.count() + 1;
                    String employeeId = "EMP" + String.format("%04d", count);

                    Employee created = Employee.builder()
                            .employeeId(employeeId)
                            .name(request.getName())
                            .email(normalizedEmail)
                            .phone(request.getPhone())
                            .adminId(request.getAdminId())
                            .build();
                    return employeeRepository.save(created);
                });

        return employee;
    }

    private String requireProvisionedPassword(String rawPassword) {
        if (rawPassword == null || rawPassword.isBlank()) {
            throw new IllegalArgumentException("password is required");
        }
        String password = rawPassword.trim();
        if (password.length() < 12) {
            throw new IllegalArgumentException("password must be at least 12 characters");
        }
        return password;
    }

    private String blankToNull(String value) {
        return value == null || value.trim().isEmpty() ? null : value.trim();
    }

    private String normalizedPan(String value) {
        String normalized = blankToNull(value);
        return normalized != null ? normalized.toUpperCase() : null;
    }

    private void requireKyc(String aadhaarNumber, String panNumber) {
        String normalizedAadhaar = blankToNull(aadhaarNumber);
        String normalizedPanValue = normalizedPan(panNumber);
        if (normalizedAadhaar == null) {
            throw new IllegalArgumentException("aadhaarNumber is required");
        }
        if (!normalizedAadhaar.matches("^[0-9]{12}$")) {
            throw new IllegalArgumentException("aadhaarNumber must be exactly 12 digits");
        }
        if (normalizedPanValue == null) {
            throw new IllegalArgumentException("panNumber is required");
        }
        if (!normalizedPanValue.matches("^[A-Z]{3}[PCHFTGA][A-Z][0-9]{4}[A-Z]$")) {
            throw new IllegalArgumentException("panNumber format is invalid");
        }
    }

    public List<Employee> getEmployees(){
        return employeeRepository.findAll();
        }

        public List<Employee> getEmployeesByAdmin(Long adminId) {
        return employeeRepository.findByAdminId(adminId);
    }

    public Employee updateEmployee(Long id, EmployeeRequest request){

        Employee emp = employeeRepository.findById(id)
                .orElseThrow();

        final String previousEmail = emp.getEmail();

        if (request.getName() != null && !request.getName().isBlank()) {
            emp.setName(request.getName().trim());
        }
        if (request.getEmail() != null && !request.getEmail().isBlank()) {
            emp.setEmail(request.getEmail().trim());
        }
        if (request.getPhone() != null) {
            emp.setPhone(request.getPhone().trim());
        }
        if (request.getAdminId() != null) {
            emp.setAdminId(request.getAdminId());
        }

        String resolvedLookupEmail = previousEmail;
        if (resolvedLookupEmail == null || resolvedLookupEmail.isBlank()) {
            resolvedLookupEmail = emp.getEmail();
        }

        if (resolvedLookupEmail != null && !resolvedLookupEmail.isBlank()) {
            final String lookupEmail = resolvedLookupEmail;
            final String currentEmail = emp.getEmail();
            userRepository.findByEmail(lookupEmail)
                    .or(() -> {
                        if (currentEmail == null || currentEmail.isBlank() || currentEmail.equals(lookupEmail)) {
                            return java.util.Optional.empty();
                        }
                        return userRepository.findByEmail(currentEmail);
                    })
                    .ifPresent(user -> {
                        if (request.getName() != null && !request.getName().isBlank()) {
                            user.setName(request.getName().trim());
                        }
                        if (request.getPhone() != null) {
                            user.setPhone(request.getPhone().trim());
                        }
                        if (request.getEmail() != null && !request.getEmail().isBlank()) {
                            user.setEmail(request.getEmail().trim());
                        }
                        userRepository.save(user);
                    });
        }

        return employeeRepository.save(emp);
    }

    public Employee updateEmployeeForAdmin(Long adminId, Long id, EmployeeRequest request) {
        Employee emp = employeeRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Employee not found"));

        if (emp.getAdminId() == null || !emp.getAdminId().equals(adminId)) {
            throw new RuntimeException("You can only update employees assigned to you");
        }

        return updateEmployee(id, request);
    }

    public void deleteEmployee(Long id){
        Employee emp = employeeRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Employee not found"));

        employeeRepository.delete(emp);

        userRepository.findByEmail(emp.getEmail()).ifPresent(user -> {
            userRepository.delete(user);
        });
    }

    public void deleteEmployeeForAdmin(Long adminId, Long id) {
        Employee emp = employeeRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Employee not found"));

        if (emp.getAdminId() == null || !emp.getAdminId().equals(adminId)) {
            throw new RuntimeException("You can only delete employees assigned to you");
        }

        deleteEmployee(id);
    }

}
