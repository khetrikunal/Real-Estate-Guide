package com.real_estate.Kunal.Controller;

import com.real_estate.Kunal.DTO.CreateUserRequest;
import com.real_estate.Kunal.DTO.EmployeeRequest;
import com.real_estate.Kunal.DTO.SubAdminDetailResponse;
import com.real_estate.Kunal.DTO.UserManagementResponse;
import com.real_estate.Kunal.Entity.Employee;
import com.real_estate.Kunal.Entity.Role;
import com.real_estate.Kunal.Entity.User;
import com.real_estate.Kunal.Service.EmployeeService;
import com.real_estate.Kunal.Service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
public class AdminManagementController {

    private final UserService userService;
    private final EmployeeService employeeService;

    @GetMapping("/subadmins")
    public List<UserManagementResponse> getSubAdminsReadOnly() {
        return userService.getAllSubAdmins();
    }

    @GetMapping("/subadmins/added")
    public List<UserManagementResponse> getSubAdminsAdded() {
        return userService.getSubAdminsAddedManually();
    }

    @GetMapping("/subadmins/self-signed-up")
    public List<UserManagementResponse> getSubAdminsSelfSignedUp() {
        return userService.getSubAdminsSelfSignedUp();
    }

    @GetMapping("/subadmins/{id}")
    public SubAdminDetailResponse getSubAdminDetail(@PathVariable Long id) {
        return userService.getSubAdminDetail(id);
    }

    @PostMapping("/subadmins")
    public UserManagementResponse createSubAdminForAdmin(@Valid @RequestBody CreateUserRequest request,
                                                         Authentication authentication) {
        User caller = userService.getActiveUserByEmail(authentication.getName());
        request.setAddedBy(caller.getId());
        if (request.getPaymentMethod() == null || request.getPaymentMethod().isBlank()) {
            request.setPaymentMethod("MANUAL");
        }
        return userService.createSubAdmin(request);
    }

    @GetMapping("/employees")
    public List<Employee> getAdminEmployees(Authentication authentication) {
        return employeeService.getEmployees();
    }

    @PostMapping("/employees")
    public UserManagementResponse createEmployeeForAdmin(@RequestBody EmployeeRequest request,
                                                         Authentication authentication) {
        User caller = userService.getActiveUserByEmail(authentication.getName());
        if (caller.getRole() == Role.SUPER_ADMIN) {
            if (request.getAdminId() == null) {
                request.setAdminId(caller.getId());
            }
        } else {
            request.setAdminId(caller.getId());
        }
        if (request.getAdminId() == null) {
            throw new RuntimeException("adminId is required");
        }
        employeeService.createEmployee(request);
        return userService.getUserManagementByEmail(request.getEmail());
    }

    @PatchMapping("/employees/{id}")
    public Employee updateEmployeeForAdmin(@PathVariable Long id,
                                           @RequestBody EmployeeRequest request,
                                           Authentication authentication) {
        return employeeService.updateEmployee(id, request);
    }

    @DeleteMapping("/employees/{id}")
    public void deleteEmployeeForAdmin(@PathVariable Long id,
                                       Authentication authentication) {
        employeeService.deleteEmployee(id);
    }

    @GetMapping("/employees/{id}/detail")
    public SubAdminDetailResponse getEmployeeDetail(@PathVariable("id") Long id) {
        return userService.getUserDetail(id);
    }
}
