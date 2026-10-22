package com.real_estate.Kunal.Service;

import com.real_estate.Kunal.DTO.CreateUserRequest;
import com.real_estate.Kunal.DTO.KycDocumentResponse;
import com.real_estate.Kunal.DTO.PaymentHistoryItemResponse;
import com.real_estate.Kunal.DTO.SubAdminDetailResponse;
import com.real_estate.Kunal.DTO.UserManagementResponse;
import com.real_estate.Kunal.Entity.KycVerificationStatus;
import com.real_estate.Kunal.Entity.Role;
import com.real_estate.Kunal.Entity.User;
import com.real_estate.Kunal.Entity.UserKycDocument;
import com.real_estate.Kunal.Repository.UserRepository;
import com.real_estate.Kunal.Repository.EmployeeRepository;
import com.real_estate.Kunal.Entity.Employee;
import com.real_estate.Kunal.Repository.PaymentRepository;
import com.real_estate.Kunal.Repository.ProjectRepository;
import com.real_estate.Kunal.Repository.UserKycDocumentRepository;

import lombok.RequiredArgsConstructor;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.ArrayList;
import java.time.LocalDate;
import java.time.LocalDateTime;
import com.real_estate.Kunal.DTO.SubAdminDetailsDTO;
import com.real_estate.Kunal.Entity.Subscription;
import com.real_estate.Kunal.Entity.BrokerLocation;
import com.real_estate.Kunal.Entity.Payment;
import com.real_estate.Kunal.Repository.CustomCityRepository;
import com.real_estate.Kunal.Repository.LocationRepository;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final EmployeeRepository employeeRepository;
    private final SubscriptionService subscriptionService;
    private final LocationRepository locationRepository;
    private final CustomCityRepository customCityRepository;
    private final PaymentService paymentService;
    private final PaymentRepository paymentRepository;
    private final ProjectRepository projectRepository;
    private final UserKycDocumentRepository userKycDocumentRepository;
    private final KycDocumentService kycDocumentService;
    private final LocationService locationService;

    public String createAdmin(CreateUserRequest request){

        final String email = request.getEmail() != null ? request.getEmail().trim().toLowerCase() : "";
        if (email.isBlank()) {
            throw new IllegalArgumentException("email is required");
        }

        if (userRepository.findByEmail(email).isPresent()) {
            throw new IllegalStateException("A user with this email already exists.");
        }
        User user = new User();

        String password = requireProvisionedPassword(request.getPassword());
        requireAdminOnlyFields(request);

        user.setName(request.getName());
        user.setEmail(email);
        user.setPhone(blankToNull(request.getPhone()));
        user.setPassword(passwordEncoder.encode(password));
        user.setRole(Role.ADMIN);
        user.setSignupSource("MANUAL");
        userRepository.save(user);

        return "Admin Created Successfully";
    }

    public UserManagementResponse createSubAdmin(CreateUserRequest request){

        final String email = request.getEmail() != null ? request.getEmail().trim().toLowerCase() : "";
        if (email.isBlank()) {
            throw new IllegalArgumentException("email is required");
        }

        if (userRepository.findByEmail(email).isPresent()) {
            throw new IllegalStateException("A SubAdmin with this email already exists.");
        }
        User user = new User();

        String subscriptionType = request.getSubscriptionType() != null
                ? request.getSubscriptionType().trim().toLowerCase()
                : "";

        if (!"location_based".equals(subscriptionType) && !"full".equals(subscriptionType)) {
            throw new IllegalArgumentException("subscriptionType must be location_based or full");
        }

        if ("location_based".equals(subscriptionType)) {
            String state = request.getAssignedState() != null ? request.getAssignedState().trim() : "";
            String city = request.getAssignedCity() != null ? request.getAssignedCity().trim() : "";
            if (state.isBlank() || city.isBlank()) {
                throw new IllegalArgumentException("assignedState and assignedCity are required for location_based");
            }
            boolean existsInLocation = locationRepository.existsByStateIgnoreCaseAndCityIgnoreCase(state, city);
            boolean existsInCustom = customCityRepository.existsByStateIgnoreCaseAndCityIgnoreCase(state, city);
            if (!existsInLocation && !existsInCustom) {
                throw new IllegalArgumentException("Assigned city does not exist in Location Management");
            }
            if (request.getSubscriptionRate() == null) {
                throw new IllegalArgumentException("subscriptionRate is required for location_based");
            }
        }

        String password = requireProvisionedPassword(request.getPassword());
        requireKyc(request.getAadhaarNumber(), request.getPanNumber());

        user.setName(request.getName());
        user.setEmail(email);
        user.setPhone(request.getPhone());
        user.setPassword(passwordEncoder.encode(password));
        user.setRole(Role.SUB_ADMIN);
        user.setSubscriptionType(subscriptionType);
        // Resolve and write FK-based location scope (replaces deprecated assignedCity/State/Area)
        if ("location_based".equals(subscriptionType)) {
            String reqCity  = request.getAssignedCity()  != null ? request.getAssignedCity().trim()  : null;
            String reqState = request.getAssignedState() != null ? request.getAssignedState().trim() : null;
            String reqArea  = request.getAssignedArea()  != null ? request.getAssignedArea().trim()  : null;
            customCityRepository.findByStateIgnoreCaseAndCityIgnoreCase(
                    reqState != null ? reqState : "", reqCity != null ? reqCity : "")
                    .ifPresent(cc -> user.setCustomCityId(cc.getId()));
            // Area resolution deferred — AreaRepository not injected here; use LocationService helper
            Long areaId = locationService.resolveAreaIdByName(reqArea, reqCity, reqState);
            user.setAreaId(areaId);
        }
        user.setSubscriptionRate(request.getSubscriptionRate());
        user.setSignupSource(request.getAddedBy() == null ? "SELF_SIGNUP" : "MANUAL");
        user.setAddedBy(request.getAddedBy());
        user.setPaymentMethod(request.getPaymentMethod());
        user.setAmountPaid(request.getAmountPaid());
        user.setSubscriptionStartAt(request.getSubscriptionStartAt() != null
                ? request.getSubscriptionStartAt()
                : LocalDate.now());
        user.setSubscriptionExpiresAt(request.getSubscriptionExpiresAt() != null
                ? request.getSubscriptionExpiresAt()
                : LocalDate.now().plusYears(1));
        user.setAutoRenewal(request.getAutoRenewal() != null ? request.getAutoRenewal() : Boolean.FALSE);
        user.setRazorpayPaymentId(request.getRazorpayPaymentId());
        applyKyc(user, request.getProfilePhotoUrl(), request.getAadhaarNumber(),
                request.getPanNumber(), request.getKycStatus());

        try {
            userRepository.save(user);
        } catch (DataIntegrityViolationException ex) {
            // Race-safe fallback: convert DB unique violations to a clean conflict message.
            throw new IllegalStateException("Email already exists.");
        }

        // Link payment to the newly created SubAdmin and mark it as used.
        if (request.getRazorpayPaymentId() != null && !request.getRazorpayPaymentId().isBlank()) {
            Payment payment = paymentService.getVerifiedPayment(request.getRazorpayPaymentId());
            paymentService.markPaymentUsed(payment.getId(), user.getId());
        }

        return toUserManagementResponse(user);
    }

    public UserManagementResponse createEmployee(CreateUserRequest request){

        final String email = request.getEmail() != null ? request.getEmail().trim().toLowerCase() : "";
        if (email.isBlank()) {
            throw new IllegalArgumentException("email is required");
        }

        final Long ownerId = request.getAdminId() != null ? request.getAdminId() : request.getAddedBy();

        if (userRepository.findByEmail(email).isPresent()) {
            throw new IllegalStateException("A user with this email already exists.");
        }
        User user = new User();

        String password = requireProvisionedPassword(request.getPassword());
        requireKyc(request.getAadhaarNumber(), request.getPanNumber());

        user.setName(request.getName());
        user.setEmail(email);
        user.setPhone(request.getPhone());
        user.setPassword(passwordEncoder.encode(password));
        user.setRole(Role.EMPLOYEE);
        user.setAddedBy(ownerId);
        user.setSignupSource("MANUAL");
        applyKyc(user, request.getProfilePhotoUrl(), request.getAadhaarNumber(),
                request.getPanNumber(), request.getKycStatus());
        userRepository.save(user);

        // Employee views read from employees table, so keep user + employee rows in sync.
        employeeRepository.findByEmail(email)
                .map(existing -> {
                    existing.setName(request.getName());
                    existing.setPhone(request.getPhone());
                    existing.setAdminId(ownerId);
                    return employeeRepository.save(existing);
                })
                .orElseGet(() -> {
                    long count = employeeRepository.count() + 1;
                    String employeeId = "EMP" + String.format("%04d", count);

                    Employee employee = Employee.builder()
                            .employeeId(employeeId)
                            .name(request.getName())
                            .email(email)
                            .phone(request.getPhone())
                            .adminId(ownerId)
                            .build();
                    return employeeRepository.save(employee);
                });

        return toUserManagementResponse(user);
    }

    public List<User> getAllUser(){
        return userRepository.findAll();
    }

    public void deleteUser(Long id){
        User user = userRepository.findById(id).orElseThrow();
        userRepository.delete(user);

        if (user.getRole() == Role.EMPLOYEE && user.getEmail() != null && !user.getEmail().isBlank()) {
            employeeRepository.findByEmail(user.getEmail()).ifPresent(employee -> {
                employeeRepository.delete(employee);
            });
        }
    }

    public List<SubAdminDetailsDTO> getRecentSubAdmins() {
        List<User> recentUsers = userRepository.findTop5ByRoleOrderByIdDesc(Role.SUB_ADMIN);
        List<SubAdminDetailsDTO> dtos = new ArrayList<>();

        for (User u : recentUsers) {
            String subType = u.getSubscriptionType() != null ? u.getSubscriptionType() : "None";
            String planType = "None";
            List<String> locNames = new ArrayList<>();

            if ("location_based".equalsIgnoreCase(subType)) {
                planType = "CUSTOM";
                String cityName = locationService.resolveUserCityName(u);
                String areaName = locationService.resolveUserAreaName(u);
                String loc = "";
                if (cityName != null) loc += cityName;
                if (areaName != null && !areaName.isBlank()) {
                    loc += " (" + areaName + ")";
                }
                if (!loc.isEmpty()) {
                    locNames.add(loc);
                }
            } else if ("full".equalsIgnoreCase(subType) || "all_india".equalsIgnoreCase(subType)) {
                planType = "ALL";
                locNames.add("All Locations");
            } else {
                // Fallback to legacy subscriptions table
                Subscription sub = subscriptionService.getActiveSubscription(u.getId());
                if (sub != null) {
                    planType = sub.getPlanType() != null ? sub.getPlanType().name() : "None";
                    if ("CUSTOM".equals(planType)) {
                        List<com.real_estate.Kunal.Entity.BrokerLocation> blList = subscriptionService.getBrokerLocations(u.getId());
                        for (com.real_estate.Kunal.Entity.BrokerLocation bl : blList) {
                            locationRepository.findById(bl.getLocationId()).ifPresent(loc -> 
                                locNames.add(loc.getCity() + ", " + loc.getState())
                            );
                        }
                    } else if ("ALL".equals(planType)) {
                        locNames.add("All Locations");
                    }
                }
            }

            dtos.add(SubAdminDetailsDTO.builder()
                    .id(u.getId())
                    .name(u.getName())
                    .email(u.getEmail())
                    .planType(planType)
                    .locations(locNames)
                    .build());
        }
        return dtos;
    }

    public List<UserManagementResponse> getSubAdminsAddedByMe(Long superAdminId) {
        return userRepository.findByRoleAndAddedBy(Role.SUB_ADMIN, superAdminId)
                .stream()
                .map(this::toUserManagementResponse)
                .toList();
    }

    public List<UserManagementResponse> getSubAdminsAddedManually() {
        return userRepository.findByRoleAndSignupSource(Role.SUB_ADMIN, "MANUAL")
                .stream()
                .map(this::toUserManagementResponse)
                .toList();
    }

    public List<UserManagementResponse> getSubAdminsSelfSignedUp() {
        return userRepository.findByRoleAndSignupSource(Role.SUB_ADMIN, "SELF_SIGNUP")
                .stream()
                .map(this::toUserManagementResponse)
                .toList();
    }

    public List<UserManagementResponse> getAllSubAdmins() {
        return userRepository.findByRole(Role.SUB_ADMIN)
                .stream()
                .map(this::toUserManagementResponse)
                .toList();
    }

    public List<UserManagementResponse> getAllAdmins() {
        return userRepository.findByRole(Role.ADMIN)
                .stream()
                .map(this::toUserManagementResponse)
                .toList();
    }

    public List<UserManagementResponse> getAllEmployees() {
        return userRepository.findByRole(Role.EMPLOYEE)
                .stream()
                .map(this::toUserManagementResponse)
                .toList();
    }

    public SubAdminDetailResponse getSubAdminDetail(Long id) {
        User subAdmin = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("SubAdmin not found"));

        if (subAdmin.getRole() != Role.SUB_ADMIN) {
            throw new RuntimeException("User is not a SubAdmin");
        }

        List<PaymentHistoryItemResponse> paymentHistory = paymentRepository
                .findBySubAdminIdOrderByCreatedAtDesc(id)
                .stream()
                .map(p -> PaymentHistoryItemResponse.builder()
                        .paymentId(p.getRazorpayPaymentId())
                        .orderId(p.getRazorpayOrderId())
                        .status(p.getStatus())
                        .currency(p.getCurrency())
                        .amountInPaise(p.getAmountInPaise())
                        .createdAt(p.getCreatedAt())
                        .verifiedAt(p.getVerifiedAt())
                        .build())
                .toList();

        int projectsCount = projectRepository.findByUploadedByAndIsDeletedFalse(id).size();

        return SubAdminDetailResponse.builder()
                .profile(toUserManagementResponse(subAdmin))
                .paymentHistory(paymentHistory)
                .projectsCount(projectsCount)
                .build();
    }

    public com.real_estate.Kunal.DTO.UserManagementResponse updateSubAdmin(Long id, java.util.Map<String, Object> updates) {
        User subAdmin = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("SubAdmin not found"));

        if (updates.containsKey("name")) {
            subAdmin.setName((String) updates.get("name"));
        }
        if (updates.containsKey("email")) {
            subAdmin.setEmail((String) updates.get("email"));
        }
        if (updates.containsKey("subscriptionExpiresAt")) {
            String expStr = (String) updates.get("subscriptionExpiresAt");
            if (expStr != null && !expStr.isBlank()) {
                subAdmin.setSubscriptionExpiresAt(java.time.LocalDate.parse(expStr.split("T")[0]));
            } else {
                subAdmin.setSubscriptionExpiresAt(null);
            }
        }
        
        userRepository.save(subAdmin);
        return toUserManagementResponse(subAdmin);
    }

    /**
     * Generic detail endpoint that works for any user role (Admin, Employee, SubAdmin).
     * Returns the same SubAdminDetailResponse shape for consistency.
     */
    public SubAdminDetailResponse getUserDetail(Long id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("User not found"));

        List<PaymentHistoryItemResponse> paymentHistory = paymentRepository
                .findBySubAdminIdOrderByCreatedAtDesc(id)
                .stream()
                .map(p -> PaymentHistoryItemResponse.builder()
                        .paymentId(p.getRazorpayPaymentId())
                        .orderId(p.getRazorpayOrderId())
                        .status(p.getStatus())
                        .currency(p.getCurrency())
                        .amountInPaise(p.getAmountInPaise())
                        .createdAt(p.getCreatedAt())
                        .verifiedAt(p.getVerifiedAt())
                        .build())
                .toList();

        int projectsCount = projectRepository.findByUploadedByAndIsDeletedFalse(id).size();

        return SubAdminDetailResponse.builder()
                .profile(toUserManagementResponse(user))
                .paymentHistory(paymentHistory)
                .projectsCount(projectsCount)
                .build();
    }

    public User getActiveUserByEmail(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));
    }

    public UserManagementResponse getUserManagementByEmail(String email) {
        return toUserManagementResponse(getActiveUserByEmail(email));
    }

    @Transactional
    public UserManagementResponse updateKycStatus(Long userId, String status, Long verifiedBy, String rejectionReason) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));
        KycVerificationStatus normalized = parseKycStatus(status);
        if (normalized == KycVerificationStatus.REJECTED && (rejectionReason == null || rejectionReason.isBlank())) {
            throw new IllegalArgumentException("rejectionReason is required when rejecting KYC");
        }
        if (normalized == KycVerificationStatus.VERIFIED) {
            requireKyc(user.getAadhaarNumber(), user.getPanNumber());
            kycDocumentService.ensureUserHasRequiredDocuments(userId);
        }

        user.setKycStatus(normalized.name());
        user.setKycVerifiedBy(normalized == KycVerificationStatus.VERIFIED ? verifiedBy : null);
        user.setKycVerifiedAt(normalized == KycVerificationStatus.VERIFIED ? LocalDateTime.now() : null);
        user.setKycRejectionReason(normalized == KycVerificationStatus.REJECTED ? rejectionReason.trim() : null);

        List<UserKycDocument> documents = userKycDocumentRepository.findByUserId(userId);
        for (UserKycDocument document : documents) {
            document.setVerificationStatus(normalized);
        }
        userKycDocumentRepository.saveAll(documents);
        return toUserManagementResponse(userRepository.save(user));
    }

    private KycVerificationStatus parseKycStatus(String status) {
        String normalized = status == null || status.isBlank() ? KycVerificationStatus.PENDING.name() : status.trim().toUpperCase();
        try {
            return KycVerificationStatus.valueOf(normalized);
        } catch (IllegalArgumentException ex) {
            throw new IllegalArgumentException("Invalid KYC status: " + status);
        }
    }

    private String requireProvisionedPassword(String rawPassword) {
        if (rawPassword == null || rawPassword.isBlank()) {
            throw new IllegalArgumentException("password is required");
        }
        String password = rawPassword.trim();
        if (password.length() < 8) {
            throw new IllegalArgumentException("password must be at least 8 characters");
        }
        return password;
    }

    private void requireAdminOnlyFields(CreateUserRequest request) {
        if (blankToNull(request.getProfilePhotoUrl()) != null
                || blankToNull(request.getAadhaarNumber()) != null
                || blankToNull(request.getAadhaarCardUrl()) != null
                || blankToNull(request.getPanNumber()) != null
                || blankToNull(request.getKycStatus()) != null) {
            throw new IllegalArgumentException("identity fields are not accepted for admin creation");
        }
        if (blankToNull(request.getSubscriptionType()) != null
                || blankToNull(request.getAssignedCity()) != null
                || blankToNull(request.getAssignedState()) != null
                || blankToNull(request.getAssignedArea()) != null
                || request.getSubscriptionRate() != null
                || blankToNull(request.getRazorpayPaymentId()) != null
                || blankToNull(request.getPaymentMethod()) != null
                || request.getAmountPaid() != null
                || request.getSubscriptionStartAt() != null
                || request.getSubscriptionExpiresAt() != null
                || request.getAutoRenewal() != null
                || blankToNull(request.getNotes()) != null
                || request.getAdminId() != null
                || request.getAddedBy() != null
                || blankToNull(request.getSignupSource()) != null) {
            throw new IllegalArgumentException("admin create accepts only name, email, phone, and password");
        }
    }

    private UserManagementResponse toUserManagementResponse(User user) {
        return UserManagementResponse.builder()
                .id(user.getId())
                .name(user.getName())
                .email(user.getEmail())
                .phone(user.getPhone())
                .role(user.getRole() != null ? user.getRole().name() : null)
                .isActive(Boolean.TRUE)
                .signupSource(user.getSignupSource())
                .subscriptionType(user.getSubscriptionType())
                .assignedCity(locationService.resolveUserCityName(user))
                .assignedState(null) // State no longer stored on User; front-end should derive from city
                .assignedArea(locationService.resolveUserAreaName(user))
                .subscriptionRate(user.getSubscriptionRate())
                .subscriptionStartAt(user.getSubscriptionStartAt())
                .subscriptionExpiresAt(user.getSubscriptionExpiresAt())
                .autoRenewal(user.getAutoRenewal())
                .paymentMethod(user.getPaymentMethod())
                .amountPaid(user.getAmountPaid())
                .razorpayPaymentId(user.getRazorpayPaymentId())
                .profilePhotoUrl(user.getProfilePhotoUrl())
                .aadhaarNumber(user.getAadhaarNumber())
                .aadhaarCardUrl(null)
                .panNumber(user.getPanNumber())
                .kycStatus(user.getKycStatus())
                .kycVerifiedBy(user.getKycVerifiedBy())
                .kycVerifiedAt(user.getKycVerifiedAt())
                .kycRejectionReason(user.getKycRejectionReason())
                .addedBy(user.getAddedBy())
                .lastLoginAt(user.getLastLoginAt())
                .createdAt(user.getCreatedAt())
                .kycDocuments(kycDocumentsForUser(user.getId()))
                .build();
    }

    private List<KycDocumentResponse> kycDocumentsForUser(Long userId) {
        if (userId == null) {
            return List.of();
        }
        return userKycDocumentRepository.findByUserId(userId).stream()
                .map(this::toKycDocumentResponse)
                .toList();
    }

    private KycDocumentResponse toKycDocumentResponse(UserKycDocument document) {
        return KycDocumentResponse.builder()
                .id(document.getId())
                .userId(document.getUserId())
                .tempRegistrationId(document.getTempRegistrationId())
                .documentType(document.getDocumentType())
                .contentType(document.getContentType())
                .originalFileName(document.getOriginalFileName())
                .fileSize(document.getFileSize())
                .verificationStatus(document.getVerificationStatus())
                .uploadedAt(document.getUploadedAt())
                .build();
    }

    private void applyKyc(User user, String profilePhotoUrl, String aadhaarNumber,
                          String panNumber, String status) {
        user.setProfilePhotoUrl(blankToNull(profilePhotoUrl));
        user.setAadhaarNumber(blankToNull(aadhaarNumber));
        String normalizedPan = blankToNull(panNumber);
        user.setPanNumber(normalizedPan != null ? normalizedPan.toUpperCase() : null);
        user.setKycStatus(blankToNull(status) != null ? status.trim().toUpperCase() : "PENDING");
    }

    private void requireKyc(String aadhaarNumber, String panNumber) {
        String normalizedAadhaar = blankToNull(aadhaarNumber);
        String normalizedPan = blankToNull(panNumber);
        if (normalizedAadhaar == null) {
            throw new IllegalArgumentException("aadhaarNumber is required");
        }
        if (!normalizedAadhaar.matches("^[0-9]{12}$")) {
            throw new IllegalArgumentException("aadhaarNumber must be exactly 12 digits");
        }
        if (normalizedPan == null) {
            throw new IllegalArgumentException("panNumber is required");
        }
        if (!normalizedPan.toUpperCase().matches("^[A-Z]{3}[PCHFTGA][A-Z][0-9]{4}[A-Z]$")) {
            throw new IllegalArgumentException("panNumber format is invalid");
        }
    }

    private String blankToNull(String value) {
        return value == null || value.trim().isEmpty() ? null : value.trim();
    }

}

