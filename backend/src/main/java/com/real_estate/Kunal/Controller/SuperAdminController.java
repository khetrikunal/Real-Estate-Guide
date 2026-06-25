package com.real_estate.Kunal.Controller;

import com.real_estate.Kunal.DTO.CreateUserRequest;
import com.real_estate.Kunal.DTO.SubAdminDetailResponse;
import com.real_estate.Kunal.Entity.User;
import com.real_estate.Kunal.DTO.SubAdminDetailsDTO;
import com.real_estate.Kunal.DTO.UserManagementResponse;
import com.real_estate.Kunal.Service.UserService;

import lombok.RequiredArgsConstructor;

import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;
import org.springframework.security.core.Authentication;

import java.util.List;

@RestController
@RequestMapping("/api/superadmin")
@RequiredArgsConstructor
public class SuperAdminController {

    private final UserService userService;

    @PostMapping("/create-admin")
    public String createAdmin(@Valid @RequestBody CreateUserRequest request){
        return userService.createAdmin(request);
    }

    @PostMapping("/create-subadmin")
    public UserManagementResponse createSubAdmin(@Valid @RequestBody CreateUserRequest request){
        return userService.createSubAdmin(request);
    }

    @PostMapping("/create-employee")
    public UserManagementResponse createEmployee(@Valid @RequestBody CreateUserRequest request){
        return userService.createEmployee(request);
    }

    @GetMapping("/users")
    public List<User> getUsers(){
        return userService.getAllUser();
    }

    @DeleteMapping("/users/{id}")
    public void deleteUser(@PathVariable Long id){
        userService.deleteUser(id);
    }

    @GetMapping("/subadmins")
    public List<UserManagementResponse> getAllSubAdmins() {
        return userService.getAllSubAdmins();
    }

    @GetMapping("/subadmins/added-by-me")
    public List<UserManagementResponse> getSubAdminsAddedByMe(Authentication authentication) {
        User current = userService.getActiveUserByEmail(authentication.getName());
        return userService.getSubAdminsAddedByMe(current.getId());
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
    public UserManagementResponse addSubAdminManual(@Valid @RequestBody CreateUserRequest request,
                                                    Authentication authentication) {
        User current = userService.getActiveUserByEmail(authentication.getName());
        request.setAddedBy(current.getId());
        request.setSignupSource("MANUAL");
        if (request.getPaymentMethod() == null || request.getPaymentMethod().isBlank()) {
            request.setPaymentMethod("manual");
        }
        return userService.createSubAdmin(request);
    }

    @DeleteMapping("/subadmins/{id}")
    public void softDeleteSubAdmin(@PathVariable Long id) {
        userService.deleteUser(id);
    }

    @PatchMapping("/subadmins/{id}")
    public UserManagementResponse updateSubAdmin(@PathVariable Long id, @RequestBody java.util.Map<String, Object> updates) {
        return userService.updateSubAdmin(id, updates);
    }

    @GetMapping("/admins")
    public List<UserManagementResponse> getAllAdmins() {
        return userService.getAllAdmins();
    }

    @PostMapping("/admins")
    public String addAdmin(@Valid @RequestBody CreateUserRequest request,
                           Authentication authentication) {
        User current = userService.getActiveUserByEmail(authentication.getName());
        request.setAddedBy(current.getId());
        return userService.createAdmin(request);
    }

    @DeleteMapping("/admins/{id}")
    public void softDeleteAdmin(@PathVariable Long id) {
        userService.deleteUser(id);
    }

    @GetMapping("/employees")
    public List<UserManagementResponse> getAllEmployees() {
        return userService.getAllEmployees();
    }

    @PostMapping("/employees")
    public UserManagementResponse addEmployee(@Valid @RequestBody CreateUserRequest request,
                                              Authentication authentication) {
        User current = userService.getActiveUserByEmail(authentication.getName());
        request.setAdminId(request.getAdminId());
        request.setAddedBy(current.getId());
        return userService.createEmployee(request);
    }

    @DeleteMapping("/employees/{id}")
    public void softDeleteEmployee(@PathVariable Long id) {
        userService.deleteUser(id);
    }

    @GetMapping("/recent-subadmins")
    public List<SubAdminDetailsDTO> getRecentSubAdmins(){
        return userService.getRecentSubAdmins();
    }

    @GetMapping("/admins/{id}/detail")
    public SubAdminDetailResponse getAdminDetail(@PathVariable Long id) {
        return userService.getUserDetail(id);
    }

    @GetMapping("/employees/{id}/detail")
    public SubAdminDetailResponse getEmployeeDetail(@PathVariable Long id) {
        return userService.getUserDetail(id);
    }

    @PatchMapping("/users/{id}/kyc")
    public UserManagementResponse updateKycStatus(@PathVariable Long id,
                                                  @RequestBody java.util.Map<String, String> body,
                                                  Authentication authentication) {
        User current = userService.getActiveUserByEmail(authentication.getName());
        return userService.updateKycStatus(
                id,
                body.get("status"),
                current.getId(),
                body.get("rejectionReason")
        );
    }

}
