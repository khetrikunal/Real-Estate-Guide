package com.real_estate.Kunal.Service;

import com.real_estate.Kunal.DTO.ProjectConfigDTO;
import com.real_estate.Kunal.DTO.ProjectDocumentResponse;
import com.real_estate.Kunal.DTO.ProjectRequest;
import com.real_estate.Kunal.DTO.ProjectResponse;
import com.real_estate.Kunal.DTO.ProjectUnitDTO;
import com.real_estate.Kunal.DTO.SaleRecordResponse;
import com.real_estate.Kunal.DTO.SellProjectRequest;
import com.real_estate.Kunal.Entity.BrokerLocation;
import com.real_estate.Kunal.Entity.Location;
import com.real_estate.Kunal.Entity.PlanType;
import com.real_estate.Kunal.Entity.Project;
import com.real_estate.Kunal.Entity.ProjectConfig;
import com.real_estate.Kunal.Entity.ProjectDocument;
import com.real_estate.Kunal.Entity.ProjectUnit;
import com.real_estate.Kunal.Entity.Role;
import com.real_estate.Kunal.Entity.Sale;
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
import com.real_estate.Kunal.Entity.Activity;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ProjectService {

    private final ProjectRepository projectRepository;
    private final ProjectConfigRepository projectConfigRepository;
    private final ProjectDocumentRepository projectDocumentRepository;
    private final ProjectUnitRepository projectUnitRepository;
    private final SaleRepository saleRepository;
    private final SubscriptionRepository subscriptionRepository;
    private final BrokerLocationRepository brokerLocationRepository;
    private final LocationRepository locationRepository;
    private final AreaRepository areaRepository;
    private final UserRepository userRepository;
    private final ActivityRepository activityRepository;
    private final SignedMediaUrlService signedMediaUrlService;
    private final ObjectStorageService objectStorageService;
    private final LocationService locationService;

    private User getCurrentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.isAuthenticated() && !auth.getPrincipal().equals("anonymousUser")) {
            return userRepository.findByEmail(auth.getName()).orElse(null);
        }
        return null;
    }

    @Transactional
    public ProjectResponse createProject(ProjectRequest request) {
        Project project = new Project();
        User user = getCurrentUser();
        Long resolvedLocationId = resolveLocationIdOrThrow(request, null);

        String normalizedBuilderName = normalizeOptionalBuilderName(request.getBuilderName());

        String normalizedBuilderNumber = normalizeAndValidateBuilderNumber(request.getBuilderNumber());


        String projectName = request.getProjectName();
        if (projectName == null || projectName.isBlank()) {
            if ("LAND".equalsIgnoreCase(request.getPropertyCategory()) || "PLOT".equalsIgnoreCase(request.getPropertyCategory())) {
                if (request.getPlotNumber() != null && !request.getPlotNumber().isBlank()) {
                    projectName = "Plot " + request.getPlotNumber().trim();
                } else if (request.getSurveyNumber() != null && !request.getSurveyNumber().isBlank()) {
                    projectName = "Survey No. " + request.getSurveyNumber().trim();
                } else if (request.getArea() != null && !request.getArea().isBlank()) {
                    projectName = "Land at " + request.getArea().trim();
                } else {
                    projectName = "Land Parcel";
                }
            } else {
                projectName = "Unnamed Project";
            }
        }
        project.setProjectName(projectName);
        project.setLocationId(resolvedLocationId);
        project.setDescription(request.getDescription());
        project.setUploadedBy(user != null ? user.getId() : request.getUploadedBy());
        project.setModifiedBy(user != null ? user.getId() : request.getUploadedBy());
        project.setAddress(request.getAddress());

        Location resolvedLocation = resolvedLocationId != null
                ? locationRepository.findById(resolvedLocationId).orElse(null)
                : null;
        if (resolvedLocation != null) {
            project.setCity(resolvedLocation.getCity());
            project.setArea(resolvedLocation.getArea());
            project.setState(resolvedLocation.getState());
        } else {
            project.setCity(request.getCity());
            project.setArea(normalizeOptionalText(request.getArea()));
            project.setState(request.getState());
        }

        project.setZipCode(request.getZipCode());
        project.setGoogleMapsUrl(request.getGoogleMapsUrl());

        project.setBuilderName(normalizedBuilderName);
        project.setBuilderNumber(normalizedBuilderNumber);

        // Property taxonomy + timeline + summary fields
        project.setPropertyCategory(request.getPropertyCategory());
        project.setPropertySubcategory(request.getPropertySubcategory());
        project.setPossessionDate(request.getPossessionDate());
        project.setProjectStatus(request.getProjectStatus());

        project.setPrice(request.getPrice());
        project.setPricePerSqft(request.getPricePerSqFt());
        project.setCarpetArea(request.getCarpetArea());
        project.setBuiltUpArea(request.getBuiltUpArea());
        project.setSuperBuiltUpArea(request.getSuperBuiltUpArea());

        if (request.getBuilderEmail() != null) project.setBuilderEmail(request.getBuilderEmail().trim());
        if (request.getPropertyType() != null) project.setPropertyType(request.getPropertyType().trim());
        if (request.getApartmentName() != null) project.setApartmentName(request.getApartmentName().trim());
        if (request.getTotalLandArea() != null) project.setTotalLandArea(request.getTotalLandArea());
        if (request.getTotalLandAreaUnit() != null) project.setTotalLandAreaUnit(request.getTotalLandAreaUnit().trim());
        if (request.getTotalBuiltUpArea() != null) project.setTotalBuiltUpArea(request.getTotalBuiltUpArea());

        project.setPlotNumber(request.getPlotNumber());
        project.setSurveyNumber(request.getSurveyNumber());
        project.setPlotDimensions(request.getPlotDimensions());
        project.setOwnershipType(request.getOwnershipType());
        project.setHasMultipleTowers(request.getHasMultipleTowers() != null ? request.getHasMultipleTowers() : false);
        project.setTowerCount(request.getTowerCount());

        String propCode = request.getPropertyCode();
        if (propCode == null || propCode.isBlank()) {
            propCode = "PROP-" + (System.currentTimeMillis() % 1000000);
        }
        project.setPropertyCode(propCode);

        validateCoordinates(request.getLatitude(), request.getLongitude());
        project.setLatitude(request.getLatitude());

        project.setLongitude(request.getLongitude());
        project.setStatus(normalizedProjectStatus(request.getStatus()));

        if (user != null
                && user.getRole() == Role.SUB_ADMIN
                && "location_based".equals(user.getSubscriptionType())) {
            String resolvedCity = locationService.resolveUserCityName(user);
            if (resolvedCity != null && !resolvedCity.isBlank()) {
                List<String> assignedCities = scopeValues(resolvedCity);
                String reqCity = project.getCity();
                if ((reqCity == null || reqCity.isBlank()) && assignedCities.size() == 1 && !hasAllScope(assignedCities)) {
                    project.setCity(assignedCities.get(0));
                } else if (reqCity != null && !reqCity.isBlank() && !matchesScope(reqCity, assignedCities)) {
                    throw new ResponseStatusException(
                            HttpStatus.FORBIDDEN,
                            "You can only create projects in your assigned city: " + resolvedCity.trim()
                    );
                }
            }

            if (project.getState() == null || project.getState().isBlank()) {
                // State is no longer stored on User; rely on the city FK to derive it if needed
            }

            // Auto-fill area from SubAdmin's area scope if blank
            String resolvedArea = locationService.resolveUserAreaName(user);
            if ((project.getArea() == null || project.getArea().isBlank())
                    && resolvedArea != null && !resolvedArea.isBlank()) {
                project.setArea(resolvedArea.trim());
            }
        }
        assertProjectAccess(user, project.getCity(), project.getArea());

        Project savedProject = projectRepository.save(project);

        // Persist multi-configs if provided
        if (request.getConfigs() != null && !request.getConfigs().isEmpty()) {
            if (savedProject.getConfigs() == null) {
                savedProject.setConfigs(new ArrayList<>());
            }
            for (ProjectConfigDTO dto : request.getConfigs()) {
                ProjectConfig config = ProjectConfig.builder()
                        .project(savedProject)
                        .configLabel(dto.getConfigLabel())
                        .propertyType(dto.getPropertyType())
                        .listingType(dto.getListingType())
                        .completionPercentage(dto.getCompletionPercentage() != null ? dto.getCompletionPercentage() : 0)
                        .units(dto.getUnits() != null ? dto.getUnits() : 0)
                        .unitsSold(dto.getUnitsSold() != null ? dto.getUnitsSold() : 0)
                        .price(configPrice(dto))
                        .floorNo(dto.getFloorNo())
                        .flatType(dto.getFlatType())
                        .carpetAreaSqft(dto.getCarpetAreaSqft())
                        .saleableAreaSqft(dto.getSaleableAreaSqft())
                        .ratePerSqft(dto.getRatePerSqft())
                        .parkingAvailable(dto.getParkingAvailable())
                        .parkingCost(normalizedParkingCost(dto))
                        .build();
                savedProject.getConfigs().add(config);
            }
            savedProject = projectRepository.saveAndFlush(savedProject);
            for (ProjectConfig config : savedProject.getConfigs()) {
                if (config.getId() == null) {
                    ProjectConfig savedConfig = projectConfigRepository.saveAndFlush(config);
                    config.setId(savedConfig.getId());
                }
            }
            syncUnitsForProject(savedProject, request.getConfigs());
        }
        
        // Log Activity
        activityRepository.save(Activity.builder()
                .type("PROJECT_ADDED")
                .description((user != null ? user.getName() : "System") + " added project '" + savedProject.getProjectName() + "'")
                .userName(user != null ? user.getName() : "System")
                .projectName(savedProject.getProjectName())
                .city(savedProject.getCity())
                .timestamp(LocalDateTime.now())
                .userId(user != null ? user.getId() : null)
                .build());

        return toProjectResponse(savedProject);
    }

    public List<ProjectResponse> getAllProjects() {
        User user = getCurrentUser();
        assertActiveSubadminSubscription(user);
        if (isOwnScopedRole(user)) {
            return toProjectResponses(projectRepository.findByUploadedByAndIsDeletedFalse(user.getId()));
        }
        return toProjectResponses(projectRepository.findByIsDeletedFalse());
    }

    public ProjectResponse getProjectById(Long id) {
        Project project = findProjectEntity(id);
        ensureProjectVisible(project);
        return toProjectResponse(project);
    }

    @Transactional
    public ProjectResponse updateProject(Long id, ProjectRequest request) {
        Project project = findProjectEntity(id);
        User user = getCurrentUser();
        Long resolvedLocationId = resolveLocationIdOrThrow(request, project.getLocationId());

        ensureCanModifyProject(project);

        String normalizedBuilderName = normalizeOptionalBuilderName(request.getBuilderName());

        String normalizedBuilderNumber = normalizeAndValidateBuilderNumber(request.getBuilderNumber());


        if (request.getProjectName() != null && !request.getProjectName().isBlank()) {
            project.setProjectName(request.getProjectName().trim());
        }
        project.setLocationId(resolvedLocationId);
        project.setDescription(request.getDescription());
        project.setModifiedBy(user != null ? user.getId() : null);
        project.setAddress(request.getAddress());

        Location resolvedLocation = locationRepository.findById(resolvedLocationId).orElse(null);
        if (resolvedLocation != null) {
            project.setCity(resolvedLocation.getCity());
            project.setArea(resolvedLocation.getArea());
            project.setState(resolvedLocation.getState());
        } else {
            project.setCity(request.getCity());
            project.setArea(normalizeOptionalText(request.getArea()));
            project.setState(request.getState());
        }

        project.setZipCode(request.getZipCode());
        project.setGoogleMapsUrl(request.getGoogleMapsUrl());

        project.setBuilderName(normalizedBuilderName);
        project.setBuilderNumber(normalizedBuilderNumber);

        // Property taxonomy + timeline + summary fields
        project.setPropertyCategory(request.getPropertyCategory());
        project.setPropertySubcategory(request.getPropertySubcategory());
        project.setPossessionDate(request.getPossessionDate());
        project.setProjectStatus(request.getProjectStatus());

        project.setPrice(request.getPrice());
        project.setPricePerSqft(request.getPricePerSqFt());
        project.setCarpetArea(request.getCarpetArea());
        project.setBuiltUpArea(request.getBuiltUpArea());
        project.setSuperBuiltUpArea(request.getSuperBuiltUpArea());

        validateCoordinates(request.getLatitude(), request.getLongitude());

        if (request.getLatitude() != null) {
            project.setLatitude(request.getLatitude());
        }
        if (request.getLongitude() != null) {
            project.setLongitude(request.getLongitude());
        }
        if (request.getStatus() != null) {
            project.setStatus(normalizedProjectStatus(request.getStatus()));
        }

        // Property taxonomy + timeline + summary fields
        project.setPropertyCategory(request.getPropertyCategory());
        project.setPropertySubcategory(request.getPropertySubcategory());
        project.setPossessionDate(request.getPossessionDate());
        project.setProjectStatus(request.getProjectStatus());

        project.setPrice(request.getPrice());
        project.setPricePerSqft(request.getPricePerSqFt());
        project.setCarpetArea(request.getCarpetArea());
        project.setBuiltUpArea(request.getBuiltUpArea());
        project.setSuperBuiltUpArea(request.getSuperBuiltUpArea());

        if (request.getBuilderEmail() != null) project.setBuilderEmail(request.getBuilderEmail().trim());
        if (request.getPropertyType() != null) project.setPropertyType(request.getPropertyType().trim());
        if (request.getApartmentName() != null) project.setApartmentName(request.getApartmentName().trim());
        if (request.getTotalLandArea() != null) project.setTotalLandArea(request.getTotalLandArea());
        if (request.getTotalLandAreaUnit() != null) project.setTotalLandAreaUnit(request.getTotalLandAreaUnit().trim());
        if (request.getTotalBuiltUpArea() != null) project.setTotalBuiltUpArea(request.getTotalBuiltUpArea());
        if (request.getPropertyCode() != null && !request.getPropertyCode().isBlank()) {
            project.setPropertyCode(request.getPropertyCode().trim());
        }

        if (request.getPlotNumber() != null) project.setPlotNumber(request.getPlotNumber().trim());
        if (request.getSurveyNumber() != null) project.setSurveyNumber(request.getSurveyNumber().trim());
        if (request.getPlotDimensions() != null) project.setPlotDimensions(request.getPlotDimensions().trim());
        if (request.getOwnershipType() != null) project.setOwnershipType(request.getOwnershipType().trim());
        if (request.getHasMultipleTowers() != null) project.setHasMultipleTowers(request.getHasMultipleTowers());
        if (request.getTowerCount() != null) project.setTowerCount(request.getTowerCount());


        if (user != null
                && user.getRole() == Role.SUB_ADMIN
                && "location_based".equals(user.getSubscriptionType())) {
            String resolvedCity = locationService.resolveUserCityName(user);
            if (resolvedCity != null && !resolvedCity.isBlank()) {
                List<String> assignedCities = scopeValues(resolvedCity);
                if (project.getCity() == null || !matchesScope(project.getCity(), assignedCities)) {
                    throw new ResponseStatusException(
                            HttpStatus.FORBIDDEN,
                            "You can only keep projects in your assigned city: " + resolvedCity.trim()
                    );
                }
            }
            // Auto-fill area from SubAdmin's area scope if blank
            String resolvedArea = locationService.resolveUserAreaName(user);
            if ((project.getArea() == null || project.getArea().isBlank())
                    && resolvedArea != null && !resolvedArea.isBlank()) {
                project.setArea(resolvedArea.trim());
            }
        }

        // Update configs
        if (request.getConfigs() != null) {
            projectUnitRepository.deleteByProjectId(project.getId());
            projectUnitRepository.flush();
            if (project.getConfigs() == null) {
                project.setConfigs(new ArrayList<>());
            } else {
                project.getConfigs().clear();
            }
            projectRepository.saveAndFlush(project);
            for (ProjectConfigDTO dto : request.getConfigs()) {
                ProjectConfig config = ProjectConfig.builder()
                        .project(project)
                        .configLabel(dto.getConfigLabel())
                        .propertyType(dto.getPropertyType())
                        .listingType(dto.getListingType())
                        .completionPercentage(dto.getCompletionPercentage() != null ? dto.getCompletionPercentage() : 0)
                        .units(dto.getUnits() != null ? dto.getUnits() : 0)
                        .unitsSold(dto.getUnitsSold() != null ? dto.getUnitsSold() : 0)
                        .price(configPrice(dto))
                        .floorNo(dto.getFloorNo())
                        .flatType(dto.getFlatType())
                        .carpetAreaSqft(dto.getCarpetAreaSqft())
                        .saleableAreaSqft(dto.getSaleableAreaSqft())
                        .ratePerSqft(dto.getRatePerSqft())
                        .parkingAvailable(dto.getParkingAvailable())
                        .parkingCost(normalizedParkingCost(dto))
                        .build();
                project.getConfigs().add(config);
            }
        }

        Project savedProject = projectRepository.saveAndFlush(project);
        if (request.getConfigs() != null) {
            if (savedProject.getConfigs() != null) {
                for (ProjectConfig config : savedProject.getConfigs()) {
                    if (config.getId() == null) {
                        ProjectConfig savedConfig = projectConfigRepository.saveAndFlush(config);
                        config.setId(savedConfig.getId());
                    }
                }
            }
            syncUnitsForProject(savedProject, request.getConfigs());
        }
        return toProjectResponse(savedProject);
    }

    @Transactional
    public ProjectResponse moveToTrash(Long id) {
        Project project = findProjectEntity(id);
        ensureCanModifyProject(project);

        if (!Boolean.TRUE.equals(project.getIsDeleted())) {
            User user = getCurrentUser();
            project.setIsDeleted(true);
            project.setDeletedAt(LocalDateTime.now());
            if (user != null) {
                project.setModifiedBy(user.getId());
            }
            project = projectRepository.save(project);

            if (user != null) {
                activityRepository.save(Activity.builder()
                        .type("PROJECT_TRASHED")
                        .description(user.getName() + " moved project '" + project.getProjectName() + "' to Trash")
                        .userName(user.getName())
                        .projectName(project.getProjectName())
                        .city(project.getCity())
                        .timestamp(LocalDateTime.now())
                        .userId(user.getId())
                        .build());
            }
        }

        return toProjectResponse(project);
    }

    @Transactional
    public ProjectResponse restoreProject(Long id) {
        Project project = findProjectEntity(id);
        ensureCanModifyProject(project);

        if (Boolean.TRUE.equals(project.getIsDeleted())) {
            User user = getCurrentUser();
            project.setIsDeleted(false);
            project.setDeletedAt(null);
            if (user != null) {
                project.setModifiedBy(user.getId());
            }
            project = projectRepository.save(project);

            if (user != null) {
                activityRepository.save(Activity.builder()
                        .type("PROJECT_RESTORED")
                        .description(user.getName() + " restored project '" + project.getProjectName() + "' from Trash")
                        .userName(user.getName())
                        .projectName(project.getProjectName())
                        .city(project.getCity())
                        .timestamp(LocalDateTime.now())
                        .userId(user.getId())
                        .build());
            }
        }

        return toProjectResponse(project);
    }

    public List<ProjectResponse> getTrashProjects() {
        User user = getCurrentUser();
        assertActiveSubadminSubscription(user);
        if (isOwnScopedRole(user)) {
            return toProjectResponses(projectRepository.findByUploadedByAndIsDeletedTrueOrderByDeletedAtDesc(user.getId()));
        }
        return toProjectResponses(projectRepository.findByIsDeletedTrueOrderByDeletedAtDesc());
    }

    @Transactional
    public void deleteProjectPermanently(Long id) {
        Project project = findProjectEntity(id);
        ensureCanModifyProject(project);

        // Check dependencies - prevent deletion if sales records exist
        List<Sale> sales = saleRepository.findByProjectId(id);
        if (!sales.isEmpty()) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Cannot permanently delete project '" + project.getProjectName() + "' because it has "
                            + sales.size() + " recorded sales transaction(s). Projects with financial or sales records cannot be permanently purged."
            );
        }

        List<ProjectDocument> documents = projectDocumentRepository.findByProjectId(id);
        for (ProjectDocument document : documents) {
            if (document.getFilePath() != null && !document.getFilePath().isBlank()) {
                try {
                    objectStorageService.deleteProjectDocument(document.getFilePath());
                } catch (Exception ignored) {
                }
            }
        }
        projectDocumentRepository.deleteByProjectId(id);
        projectUnitRepository.deleteByProjectId(id);

        User user = getCurrentUser();
        if (user != null) {
            activityRepository.save(Activity.builder()
                    .type("PROJECT_PERMANENTLY_DELETED")
                    .description(user.getName() + " permanently deleted project '" + project.getProjectName() + "'")
                    .userName(user.getName())
                    .projectName(project.getProjectName())
                    .city(project.getCity())
                    .timestamp(LocalDateTime.now())
                    .userId(user.getId())
                    .build());
        }

        projectRepository.delete(project);
    }

    public void deleteProject(Long id) {
        moveToTrash(id);
    }

    public List<ProjectResponse> searchProjects(
            String propertyType,
            String listingType,
            Double minPrice,
            Double maxPrice,
            List<String> completionBuckets
    ) {
        User user = getCurrentUser();
        assertActiveSubadminSubscription(user);
        Long uploadedBy = isOwnScopedRole(user) ? user.getId() : null;

        List<Project> projects = projectRepository.searchProjects(
                propertyType,
                listingType,
                minPrice,
                maxPrice,
                uploadedBy
        );

        if (completionBuckets != null && !completionBuckets.isEmpty()) {
            projects = projects.stream().filter(project -> {
                for (ProjectConfig config : project.getConfigs()) {
                    for (String bucket : completionBuckets) {
                        String[] parts = bucket.split("-");
                        if (parts.length == 2) {
                            try {
                                double min = Double.parseDouble(parts[0]);
                                double max = Double.parseDouble(parts[1]);
                                double completion = config.getCompletionPercentage();
                                if (min == 90 && max == 100) {
                                    if (completion >= min && completion <= max) {
                                        return true;
                                    }
                                } else if (completion >= min && completion < max) {
                                    return true;
                                }
                            } catch (NumberFormatException ignored) {
                            }
                        }
                    }
                }
                return false;
            }).collect(Collectors.toList());
        }

        return toProjectResponses(projects);
    }

    public List<ProjectResponse> getBrokerAccessibleProjects(Long brokerId) {
        User current = getCurrentUser();
        if (isOwnScopedRole(current) && !Objects.equals(current.getId(), brokerId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "You can only access your own projects");
        }
        User broker = userRepository.findById(brokerId).orElse(null);
        if (broker != null && broker.getRole() == Role.SUB_ADMIN) {
            assertActiveSubadminSubscription(broker);
            return toProjectResponses(projectRepository.findByUploadedByAndIsDeletedFalse(broker.getId()));
        }

        Subscription subscription = subscriptionRepository
                .findByUserIdAndStatus(brokerId, "ACTIVE")
                .orElse(null);

        if (subscription == null) {
            return Collections.emptyList();
        }

        if (subscription.getPlanType() == PlanType.ALL) {
            return toProjectResponses(projectRepository.findByIsDeletedFalse());
        }

        List<Long> locationIds = brokerLocationRepository.findByBrokerId(brokerId)
                .stream()
                .map(BrokerLocation::getLocationId)
                .collect(Collectors.toList());

        if (locationIds.isEmpty()) {
            return Collections.emptyList();
        }

        return toProjectResponses(projectRepository.findByLocationIdInAndIsDeletedFalse(locationIds));
    }

    public List<ProjectResponse> getEmployeeProjects(Long employeeId) {
        User user = getCurrentUser();
        if (user != null && user.getRole() == Role.EMPLOYEE && !Objects.equals(user.getId(), employeeId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Employees can only access their own projects");
        }
        assertActiveSubadminSubscription(user);
        return toProjectResponses(projectRepository.findByUploadedByAndIsDeletedFalse(employeeId));
    }

    public List<ProjectResponse> getProjectsByUploader(Long uploaderId) {
        User user = getCurrentUser();
        assertActiveSubadminSubscription(user);
        if (isOwnScopedRole(user)
                && !Objects.equals(user.getId(), uploaderId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "You can only access your own projects");
        }
        return toProjectResponses(projectRepository.findByUploadedByAndIsDeletedFalse(uploaderId));
    }

    public List<ProjectDocumentResponse> getProjectDocumentResponses(Long projectId) {
        Project project = findProjectEntity(projectId);
        ensureProjectVisible(project);

        return projectDocumentRepository.findByProjectId(projectId)
                .stream()
                .sorted(Comparator.comparing(ProjectDocument::getUploadedAt, Comparator.nullsLast(Comparator.reverseOrder())))
                .map(this::toProjectDocumentResponse)
                .toList();
    }

    public Project findProjectEntity(Long id) {
        return projectRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Project not found"));
    }

    @Transactional
    public ProjectResponse recordSale(Long projectId, SellProjectRequest request) {
        Project project = projectRepository.findByIdForUpdate(projectId)
                .orElseThrow(() -> new RuntimeException("Project not found"));
        ensureProjectVisible(project);
        ensureCanSellProject(project);

        User user = getCurrentUser();
        if (user == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Authentication required");
        }
        if (request.getBuyerName() == null || request.getBuyerName().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "buyerName is required");
        }
        if (request.getBuyerPhone() == null || request.getBuyerPhone().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "buyerPhone is required");
        }

        if (request.getConfigurationId() == null || request.getUnitId() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "configurationId and unitId are required");
        }
        if (request.getUnitsSold() != null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "unitsSold is legacy input; select one available unit instead");
        }

        ProjectConfig targetConfig = projectConfigRepository.findByIdAndProjectId(request.getConfigurationId(), projectId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "Configuration not found for this project"));
        int soldBeforeSale = projectUnitRepository.countByConfigIdAndStatus(targetConfig.getId(), "SOLD");
        if (targetConfig.getUnits() <= 0 || soldBeforeSale >= targetConfig.getUnits()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Selected configuration is sold out");
        }
        ProjectUnit targetUnit = projectUnitRepository
                .findByIdAndProjectIdAndConfigId(request.getUnitId(), projectId, targetConfig.getId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "Unit not found for this configuration"));
        if (!"AVAILABLE".equalsIgnoreCase(targetUnit.getStatus())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Selected unit is already sold");
        }

        targetUnit.setStatus("SOLD");
        targetUnit.setSoldAt(LocalDateTime.now());
        projectUnitRepository.save(targetUnit);
        targetConfig.setUnitsSold(projectUnitRepository.countByConfigIdAndStatus(targetConfig.getId(), "SOLD"));
        projectConfigRepository.save(targetConfig);
        double salePrice = targetConfig.getPrice();

        // Check overall project completion
        int totalUnits = project.getConfigs() == null || project.getConfigs().isEmpty()
                ? projectUnitRepository.findByProjectId(project.getId()).size()
                : project.getConfigs().stream().mapToInt(ProjectConfig::getUnits).sum();
        int totalSold = projectUnitRepository.findByProjectId(project.getId()).stream()
                .mapToInt(unit -> "SOLD".equalsIgnoreCase(unit.getStatus()) ? 1 : 0)
                .sum();
        int totalUnitsLeft = Math.max(0, totalUnits - totalSold);
        if (totalUnitsLeft == 0) {
            project.setStatus("completed");
            project.setCompletedAt(LocalDateTime.now());
        } else {
            project.setStatus("active");
        }
        projectRepository.save(project);

        double recordedAmount = request.getAmount() != null ? request.getAmount() : salePrice;
        Sale sale = Sale.builder()
                .projectId(project.getId())
                .projectName(project.getProjectName())
                .configurationId(targetConfig != null ? targetConfig.getId() : null)
                .configLabel(targetConfig != null ? targetConfig.getConfigLabel() : null)
                .propertyType(targetConfig != null ? targetConfig.getPropertyType() : null)
                .listingType(targetConfig != null ? targetConfig.getListingType() : null)
                .unitId(targetUnit.getId())
                .unitLabel(targetUnit.getUnitLabel())
                .unitNo(targetUnit.getUnitNo())
                .floorNo(targetUnit.getFloorNo())
                .carpetAreaSqft(targetConfig != null ? targetConfig.getCarpetAreaSqft() : null)
                .saleableAreaSqft(targetConfig != null ? targetConfig.getSaleableAreaSqft() : null)
                .ratePerSqft(targetConfig != null ? targetConfig.getRatePerSqft() : null)
                .parkingAvailable(targetConfig != null ? targetConfig.getParkingAvailable() : null)
                .parkingCost(targetConfig != null ? targetConfig.getParkingCost() : null)
                .completionPercentage(targetConfig != null ? (double) targetConfig.getCompletionPercentage() : null)
                .soldByUserId(user.getId())
                .soldByName(user.getName())
                .soldByRole(user.getRole() != null ? user.getRole().name() : null)
                .employeeId(user.getId().toString())
                .unitsSold(1)
                .amount(recordedAmount)
                .buyerName(request.getBuyerName())
                .buyerPhone(request.getBuyerPhone())
                .buyerEmail(request.getBuyerEmail())
                .notes(request.getNotes())
                .saleDate(LocalDateTime.now())
                .build();
        saleRepository.save(sale);
        targetUnit.setSaleId(sale.getId());
        projectUnitRepository.save(targetUnit);

        // Log Activity
        String configInfo = targetConfig != null ? " (" + targetConfig.getConfigLabel() + ")" : "";
        activityRepository.save(Activity.builder()
                .type("UNIT_SOLD")
                .description(user.getName() + " sold unit " + targetUnit.getUnitLabel() + " of '" + project.getProjectName() + "'" + configInfo)
                .userName(user.getName())
                .projectName(project.getProjectName())
                .city(project.getCity())
                .timestamp(LocalDateTime.now())
                .userId(user.getId())
                .units(sale.getUnitsSold())
                .build());

        return toProjectResponse(project);
    }

    public void ensureCanModifyProject(Project project) {
        User user = getCurrentUser();
        if (user == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Authentication required");
        }
        assertActiveSubadminSubscription(user);
        if (isOwnScopedRole(user) && !Objects.equals(project.getUploadedBy(), user.getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "You can only modify projects you created");
        }
        assertProjectAccess(user, project.getCity(), project.getArea());
    }

    public void ensureCanSellProject(Project project) {
        User user = getCurrentUser();
        if (user == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Authentication required");
        }
        assertActiveSubadminSubscription(user);
        if (isOwnScopedRole(user) && !Objects.equals(project.getUploadedBy(), user.getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "You can only sell units on projects you created");
        }
    }

    private void assertProjectAccess(User user, String city, String area) {
        if (user == null || user.getRole() != Role.SUB_ADMIN) {
            return;
        }
        assertActiveSubadminSubscription(user);
        if ("full".equalsIgnoreCase(user.getSubscriptionType())) {
            return;
        }
        String resolvedCity = locationService.resolveUserCityName(user);
        String resolvedArea = locationService.resolveUserAreaName(user);
        List<String> cityScopes = scopeValues(resolvedCity);
        List<String> areaScopes = scopeValues(resolvedArea);
        if (!matchesScope(city, cityScopes)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Project is outside assigned city");
        }
        if (!matchesScope(area, areaScopes)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Project is outside assigned area");
        }
    }

    private boolean isLocationBasedSubadmin(User user) {
        return user != null
                && user.getRole() == Role.SUB_ADMIN
                && "location_based".equalsIgnoreCase(user.getSubscriptionType());
    }

    private boolean isOwnScopedRole(User user) {
        return user != null && (user.getRole() == Role.SUB_ADMIN || user.getRole() == Role.EMPLOYEE);
    }

    private List<String> scopeValues(String value) {
        if (value == null || value.isBlank()) {
            return List.of();
        }
        return Arrays.stream(value.split(","))
                .map(String::trim)
                .filter(part -> !part.isEmpty())
                .collect(Collectors.toList());
    }

    private boolean hasAllScope(List<String> values) {
        return values.stream().anyMatch(value -> {
            String normalized = value.trim().toLowerCase().replace('-', '_').replace(' ', '_');
            return "all".equals(normalized) || "all_locations".equals(normalized) || "*".equals(normalized);
        });
    }

    private boolean matchesScope(String value, List<String> scopes) {
        if (scopes.isEmpty() || hasAllScope(scopes)) {
            return true;
        }
        return scopes.stream().anyMatch(scope -> equalsIgnoreCase(scope, value));
    }

    private String normalizeOptionalText(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim();
    }

    private List<Project> filterProjectsForUserScope(List<Project> projects, User user) {
        if (!isLocationBasedSubadmin(user)) {
            return projects;
        }
        String resolvedCity = locationService.resolveUserCityName(user);
        String resolvedArea = locationService.resolveUserAreaName(user);
        List<String> cityScopes = scopeValues(resolvedCity);
        List<String> areaScopes = scopeValues(resolvedArea);
        if (hasAllScope(cityScopes)) {
            return projects;
        }
        return projects.stream()
                .filter(project -> matchesScope(project.getCity(), cityScopes))
                .filter(project -> matchesScope(project.getArea(), areaScopes))
                .collect(Collectors.toList());
    }

    private void assertActiveSubadminSubscription(User user) {
        if (user == null || user.getRole() != Role.SUB_ADMIN) {
            return;
        }
        if (!hasActiveSubadminSubscription(user)) {
            throw new ResponseStatusException(HttpStatus.PAYMENT_REQUIRED, "Subscription expired");
        }
    }

    private boolean hasActiveSubadminSubscription(User user) {
        if (user.getId() == null) {
            return false;
        }
        LocalDate today = LocalDate.now();
        if (user.getSubscriptionExpiresAt() != null
                && user.getSubscriptionExpiresAt().isBefore(today)) {
            return false;
        }
        if (user.getSubscriptionExpiresAt() != null) {
            return true;
        }
        return subscriptionRepository.findByUserIdAndStatus(user.getId(), "ACTIVE")
                .filter(subscription -> subscription.getEndDate() == null
                        || !subscription.getEndDate().isBefore(today))
                .isPresent();
    }

    private boolean equalsIgnoreCase(String first, String second) {
        if (first == null || second == null) {
            return first == second;
        }
        return first.trim().equalsIgnoreCase(second.trim());
    }

    public void ensureProjectVisible(Project project) {
        User user = getCurrentUser();
        if (user == null) return;
        assertActiveSubadminSubscription(user);
        if (isOwnScopedRole(user) && !Objects.equals(project.getUploadedBy(), user.getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "You can only access projects you created");
        }
    }

    private ProjectResponse toProjectResponse(Project project) {
        return toProjectResponses(List.of(project)).stream()
                .findFirst()
                .orElseThrow(() -> new RuntimeException("Project not found"));
    }

    private List<ProjectResponse> toProjectResponses(List<Project> projects) {
        if (projects.isEmpty()) {
            return Collections.emptyList();
        }

        List<Long> projectIds = projects.stream()
                .map(Project::getId)
                .toList();

        List<Long> uploaderIds = projects.stream()
                .map(Project::getUploadedBy)
                .filter(Objects::nonNull)
                .distinct()
                .toList();

        List<Long> modifierIds = projects.stream()
                .map(Project::getModifiedBy)
                .filter(Objects::nonNull)
                .distinct()
                .toList();

        Map<Long, List<ProjectDocument>> documentsByProjectId = new HashMap<>();
        Map<Long, List<ProjectDocument>> documentsByConfigId = new HashMap<>();
        for (ProjectDocument document : projectDocumentRepository.findByProjectIdIn(projectIds)) {
            documentsByProjectId
                    .computeIfAbsent(document.getProjectId(), ignored -> new ArrayList<>())
                    .add(document);
            if (document.getConfigId() != null) {
                documentsByConfigId
                        .computeIfAbsent(document.getConfigId(), ignored -> new ArrayList<>())
                        .add(document);
            }
        }

        Map<Long, List<Sale>> salesByProjectId = new HashMap<>();
        List<Sale> allSales = saleRepository.findByProjectIdIn(projectIds);
        
        User currentUser = getCurrentUser();
        if (currentUser != null && (currentUser.getRole() == Role.EMPLOYEE || currentUser.getRole() == Role.SUB_ADMIN)) {
            allSales = allSales.stream()
                    .filter(s -> Objects.equals(s.getSoldByUserId(), currentUser.getId()))
                    .toList();
        }

        for (Sale sale : allSales) {
            salesByProjectId
                    .computeIfAbsent(sale.getProjectId(), ignored -> new ArrayList<>())
                    .add(sale);
        }

        Set<Long> sellerIds = salesByProjectId.values().stream()
                .flatMap(List::stream)
                .map(Sale::getSoldByUserId)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());

        List<Long> relatedUserIds = new ArrayList<>(uploaderIds);
        relatedUserIds.addAll(sellerIds);
        relatedUserIds.addAll(modifierIds);

        Map<Long, User> usersById = userRepository.findAllById(relatedUserIds)
                .stream()
                .collect(Collectors.toMap(User::getId, user -> user));

        return projects.stream()
                .map(project -> {
                    List<ProjectDocumentResponse> documentResponses = documentsByProjectId
                            .getOrDefault(project.getId(), Collections.emptyList())
                            .stream()
                            .sorted(Comparator.comparing(ProjectDocument::getUploadedAt, Comparator.nullsLast(Comparator.reverseOrder())))
                            .map(this::toProjectDocumentResponse)
                            .toList();

                    List<SaleRecordResponse> saleResponses = salesByProjectId
                            .getOrDefault(project.getId(), Collections.emptyList())
                            .stream()
                            .sorted(Comparator.comparing(Sale::getSaleDate, Comparator.nullsLast(Comparator.reverseOrder())))
                            .map(sale -> toSaleRecordResponse(sale, usersById.get(sale.getSoldByUserId())))
                            .toList();

                    User uploader = usersById.get(project.getUploadedBy());
                    User modifier = usersById.get(project.getModifiedBy());

                    return ProjectResponse.builder()
                            .id(project.getId())
                            .projectName(project.getProjectName())
                            .locationId(project.getLocationId())
                            .locationPricing(resolveLocationPricing(project))
                            .description(project.getDescription())
                            .uploadedBy(project.getUploadedBy())
                            .addedByName(uploader != null ? uploader.getName() : null)
                            .addedByRole(uploader != null && uploader.getRole() != null ? uploader.getRole().name() : null)
                            .modifiedByName(modifier != null ? modifier.getName() : null)
                            .modifiedByRole(modifier != null && modifier.getRole() != null ? modifier.getRole().name() : null)
                            .createdAt(project.getCreatedAt())
                            .updatedAt(project.getUpdatedAt())
                            .status(project.getStatus())
                            .completedAt(project.getCompletedAt())
                            .address(project.getAddress())
                            .city(project.getCity())
                            .area(project.getArea())
                            .state(project.getState())
                            .zipCode(project.getZipCode())
                            .googleMapsUrl(project.getGoogleMapsUrl())
                            .latitude(project.getLatitude())
                            .longitude(project.getLongitude())
                            .coverPhotoUrl(projectCoverPhotoUrl(project))
                            .propertyCategory(project.getPropertyCategory())
                            .propertySubcategory(project.getPropertySubcategory())
                            .possessionDate(project.getPossessionDate())
                            .projectStatus(project.getProjectStatus())
                            .pricePerSqFt(project.getPricePerSqft())
                            .carpetArea(project.getCarpetArea())
                            .builtUpArea(project.getBuiltUpArea())
                            .superBuiltUpArea(project.getSuperBuiltUpArea())
                            .plotNumber(project.getPlotNumber())
                            .surveyNumber(project.getSurveyNumber())
                            .plotDimensions(project.getPlotDimensions())
                            .ownershipType(project.getOwnershipType())
                            .hasMultipleTowers(project.getHasMultipleTowers())
                            .towerCount(project.getTowerCount())
                            .builderName(project.getBuilderName())
                            .builderNumber(project.getBuilderNumber())
                            .builderEmail(project.getBuilderEmail())
                            .propertyType(project.getPropertyType())
                            .apartmentName(project.getApartmentName())
                            .totalLandArea(project.getTotalLandArea())
                            .totalLandAreaUnit(project.getTotalLandAreaUnit())
                            .totalBuiltUpArea(project.getTotalBuiltUpArea())
                            .propertyCode(project.getPropertyCode())
                            .totalUnits(project.getTotalUnits())
                            .unitsSold(project.getUnitsSold())
                            .price(project.getPrice())
                            .documents(documentResponses)
                            .sales(saleResponses)
                            .configs(project.getConfigs() != null
                                    ? project.getConfigs().stream()
                                            .map(c -> {
                                                List<ProjectUnitDTO> unitInventory = projectUnitRepository.findByConfigId(c.getId()).stream()
                                                        .map(this::toProjectUnitDTO)
                                                        .toList();
                                                int currentUnitsSold = unitInventory.isEmpty()
                                                        ? c.getUnitsSold()
                                                        : (int) unitInventory.stream()
                                                                .filter(unit -> "SOLD".equalsIgnoreCase(unit.getStatus()))
                                                                .count();
                                                return ProjectConfigDTO.builder()
                                                        .id(c.getId())
                                                        .configLabel(c.getConfigLabel())
                                                        .propertyType(c.getPropertyType())
                                                        .listingType(c.getListingType())
                                                        .completionPercentage(c.getCompletionPercentage())
                                                        .units(c.getUnits())
                                                        .unitsSold(currentUnitsSold)
                                                        .availableUnits(Math.max(0, c.getUnits() - currentUnitsSold))
                                                        .price(c.getPrice())
                                                        .floorNo(c.getFloorNo())
                                                        .flatType(c.getFlatType())
                                                        .carpetAreaSqft(c.getCarpetAreaSqft())
                                                        .saleableAreaSqft(c.getSaleableAreaSqft())
                                                        .ratePerSqft(c.getRatePerSqft())
                                                        .parkingAvailable(c.getParkingAvailable())
                                                        .parkingCost(c.getParkingCost())
                                                        .unitInventory(unitInventory)
                                                        .documents(documentsByConfigId
                                                                .getOrDefault(c.getId(), Collections.emptyList())
                                                                .stream()
                                                                .sorted(Comparator.comparing(ProjectDocument::getUploadedAt, Comparator.nullsLast(Comparator.reverseOrder())))
                                                                .map(this::toProjectDocumentResponse)
                                                                .toList())
                                                        .build();
                                            })
                                            .toList()
                                    : Collections.emptyList())
                            .isDeleted(Boolean.TRUE.equals(project.getIsDeleted()))
                            .deletedAt(project.getDeletedAt())
                            .build();
                })
                .toList();
    }

    public ProjectDocumentResponse toProjectDocumentResponse(ProjectDocument document) {
        String fileUrl = "/api/documents/download/" + document.getId();

        return ProjectDocumentResponse.builder()
                .id(document.getId())
                .fileName(document.getFileName())
                .fileType(document.getFileType())
                .filePath(document.getFilePath())
                .fileUrl(signedMediaUrlService.signPath(fileUrl))
                .projectId(document.getProjectId())
                .configId(document.getConfigId())
                .buildingId(document.getBuildingId())
                .documentLevel(document.getDocumentLevel())
                .documentCategory(document.getDocumentCategory())
                .uploadedBy(document.getUploadedBy())
                .fileSize(document.getFileSize())
                .uploadedAt(document.getUploadedAt())
                .build();
    }

    private String projectCoverPhotoUrl(Project project) {
        String raw = project.getCoverPhotoUrl();
        if (raw == null || raw.isBlank()) {
            return raw;
        }
        if (raw.startsWith("/api/documents/download/")) {
            return signedMediaUrlService.signPath(raw);
        }
        return raw;
    }

    private SaleRecordResponse toSaleRecordResponse(Sale sale, User seller) {
        return SaleRecordResponse.builder()
                .id(sale.getId())
                .projectId(sale.getProjectId())
                .projectName(sale.getProjectName())
                .configurationId(sale.getConfigurationId())
                .configLabel(sale.getConfigLabel())
                .propertyType(sale.getPropertyType())
                .listingType(sale.getListingType())
                .unitId(sale.getUnitId())
                .unitLabel(sale.getUnitLabel())
                .unitNo(sale.getUnitNo())
                .floorNo(sale.getFloorNo())
                .carpetAreaSqft(sale.getCarpetAreaSqft())
                .saleableAreaSqft(sale.getSaleableAreaSqft())
                .ratePerSqft(sale.getRatePerSqft())
                .parkingAvailable(sale.getParkingAvailable())
                .parkingCost(sale.getParkingCost())
                .completionPercentage(sale.getCompletionPercentage())
                .soldByUserId(sale.getSoldByUserId())
                .soldByName(seller != null ? seller.getName() : sale.getSoldByName())
                .soldByRole(seller != null && seller.getRole() != null ? seller.getRole().name() : sale.getSoldByRole())
                .unitsSold(sale.getUnitsSold())
                .amount(sale.getAmount())
                .saleDate(sale.getSaleDate())
                .buyerName(sale.getBuyerName())
                .buyerPhone(sale.getBuyerPhone())
                .buyerEmail(sale.getBuyerEmail())
                .notes(sale.getNotes())
                .build();
    }

    private double configPrice(ProjectConfigDTO dto) {
        Double area = dto.getSaleableAreaSqft();
        Double rate = dto.getRatePerSqft();
        double base = area != null && area > 0 && rate != null && rate > 0
                ? area * rate
                : (dto.getPrice() != null ? dto.getPrice() : 0.0);
        Double parkingCost = normalizedParkingCost(dto);
        return base + (parkingCost != null ? parkingCost : 0.0);
    }

    private String normalizedProjectStatus(String status) {
        if (status == null || status.isBlank()) {
            return "ACTIVE";
        }
        String normalized = status.trim().toUpperCase().replace(' ', '_').replace('-', '_');
        return normalized;
    }

    private void validateCoordinates(Double latitude, Double longitude) {
        if ((latitude == null) != (longitude == null)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Latitude and longitude must be provided together");
        }
        if (latitude != null && (latitude < -90 || latitude > 90)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Latitude must be between -90 and 90");
        }
        if (longitude != null && (longitude < -180 || longitude > 180)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Longitude must be between -180 and 180");
        }
    }

    private Double normalizedParkingCost(ProjectConfigDTO dto) {
        if (!Boolean.TRUE.equals(dto.getParkingAvailable())) {
            return null;
        }
        Double cost = dto.getParkingCost();
        return cost != null && cost > 0 ? cost : 0.0;
    }

    private void syncUnitsForProject(Project project, List<ProjectConfigDTO> configDtos) {
        projectUnitRepository.deleteByProjectId(project.getId());
        projectUnitRepository.flush();
        if (project.getConfigs() == null || project.getConfigs().isEmpty()) {
            return;
        }
        List<ProjectConfig> configs = project.getConfigs();
        for (int i = 0; i < configs.size(); i++) {
            ProjectConfig config = configs.get(i);
            if (config.getId() == null) {
                ProjectConfig savedConfig = projectConfigRepository.saveAndFlush(config);
                config.setId(savedConfig.getId());
            }
            ProjectConfigDTO dto = configDtos != null && i < configDtos.size() ? configDtos.get(i) : null;
            List<String> labels = dto != null ? dto.getUnitLabels() : null;
            int unitCount = Math.max(0, config.getUnits());
            for (int unitIndex = 1; unitIndex <= unitCount; unitIndex++) {
                String label = labels != null && labels.size() >= unitIndex && labels.get(unitIndex - 1) != null
                        && !labels.get(unitIndex - 1).isBlank()
                        ? labels.get(unitIndex - 1).trim()
                        : defaultUnitLabel(config, unitIndex);
                projectUnitRepository.save(ProjectUnit.builder()
                        .projectId(project.getId())
                        .configId(config.getId())
                        .unitLabel(label)
                        .unitNo(label)
                        .floorNo(config.getFloorNo())
                        .status("AVAILABLE")
                        .build());
            }
            config.setUnitsSold(0);
            projectConfigRepository.save(config);
        }
        projectUnitRepository.flush();
    }

    private String defaultUnitLabel(ProjectConfig config, int index) {
        String prefix = config.getConfigLabel() != null && !config.getConfigLabel().isBlank()
                ? config.getConfigLabel().trim()
                : "Unit";
        return prefix + "-" + String.format("%02d", index);
    }

    private ProjectUnitDTO toProjectUnitDTO(ProjectUnit unit) {
        return ProjectUnitDTO.builder()
                .id(unit.getId())
                .projectId(unit.getProjectId())
                .configId(unit.getConfigId())
                .unitLabel(unit.getUnitLabel())
                .unitNo(unit.getUnitNo())
                .floorNo(unit.getFloorNo())
                .status(unit.getStatus())
                .soldAt(unit.getSoldAt())
                .saleId(unit.getSaleId())
                .build();
    }

    private Double resolveLocationPricing(Project project) {
        if (project.getLocation() != null && project.getLocation().getSubscriptionRate() != null) {
            return project.getLocation().getSubscriptionRate();
        }
        if (project.getLocationId() != null) {
            return locationRepository.findById(project.getLocationId())
                    .map(Location::getSubscriptionRate)
                    .orElse(null);
        }
        return null;
    }

    private Long resolveLocationIdOrThrow(ProjectRequest request, Long currentLocationId) {
        if (request.getLocationId() != null) {
            Location loc = locationRepository.findById(request.getLocationId()).orElse(null);
            if (loc != null) {
                request.setState(loc.getState());
                request.setCity(loc.getCity());
                request.setArea(loc.getArea());
                return loc.getId();
            }
            if (request.getCity() != null && !request.getCity().isBlank()) {
                return request.getLocationId();
            }
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Selected location not found. Please select an existing location.");
        }
        String city = request.getCity() != null ? request.getCity().trim() : "";
        String area = request.getArea() != null ? request.getArea().trim() : "";
        String state = request.getState() != null ? request.getState().trim() : "";

        if (city.isEmpty()) {
            if (currentLocationId != null) {
                return currentLocationId;
            }
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Location is required. Please select an existing location.");
        }

        if (!area.isEmpty() && !state.isEmpty()) {
            java.util.Optional<Location> found = locationRepository.findByCityIgnoreCaseAndStateIgnoreCaseAndAreaIgnoreCase(city, state, area);
            if (found.isPresent()) {
                return found.get().getId();
            }
        }

        if (!area.isEmpty()) {
            return locationRepository.findByCityIgnoreCaseAndAreaIgnoreCase(city, area)
                    .map(Location::getId)
                    .orElseGet(() -> fallbackLocationByStateOrCity(city, state, currentLocationId));
        }

        Long foundId = fallbackLocationByStateOrCity(city, state, currentLocationId);
        if (foundId == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Selected location not found. Please select an existing location.");
        }
        return foundId;
    }

    private Long fallbackLocationByStateOrCity(String city, String state, Long currentLocationId) {
        if (!state.isEmpty()) {
            return locationRepository.findByCityIgnoreCaseAndStateIgnoreCaseAndAreaIsNull(city, state)
                    .map(Location::getId)
                    .orElseGet(() -> locationRepository.findByCityIgnoreCaseAndAreaIsNull(city)
                            .map(Location::getId)
                            .orElse(currentLocationId));
        }
        return locationRepository.findByCityIgnoreCaseAndAreaIsNull(city)
                .map(Location::getId)
                .orElse(currentLocationId);
    }

    private String normalizeRequiredBuilderName(String rawBuilderName) {
        String normalized = rawBuilderName == null ? "" : rawBuilderName.trim();
        if (normalized.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "builderName is required");
        }
        return normalized;
    }

    private String normalizeOptionalBuilderName(String rawBuilderName) {
        if (rawBuilderName == null) return null;
        String normalized = rawBuilderName.trim();
        if (normalized.isEmpty()) return null;
        return normalized;
    }


    private String normalizeAndValidateBuilderNumber(String rawBuilderNumber) {
        if (rawBuilderNumber == null) {
            return null;
        }
        String normalizedRaw = rawBuilderNumber;


        // Normalize:
        // - remove spaces, dashes, and any non-digit chars
        // - accept "+91" prefix and strip leading "91"
        String digitsOnly = normalizedRaw.replaceAll("[^0-9]", "");

        if (digitsOnly.startsWith("91")) {
            digitsOnly = digitsOnly.substring(2);
        }

        // Backward compatible: if builderNumber missing/blank, don't block tests/legacy payloads.
        if (normalizedRaw.trim().isEmpty() || digitsOnly.isEmpty()) {
            return null;
        }


        // Strict Indian mobile validation: exactly 10 digits, starting 6-9
        if (!digitsOnly.matches("^[6-9]\\d{9}$")) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "builderNumber must be a valid Indian mobile number");
        }

        return digitsOnly;

    }


    public List<ProjectResponse> getProjectsByCity(String city, String area) {
        User user = getCurrentUser();
        assertProjectAccess(user, city, area);
        if (isOwnScopedRole(user)) {
            List<Project> ownProjects = projectRepository.findByUploadedBy(user.getId());
            return toProjectResponses(ownProjects.stream()
                    .filter(project -> matchesScope(project.getCity(), List.of(city)))
                    .filter(project -> area == null || area.isBlank() || matchesScope(project.getArea(), List.of(area)))
                    .collect(Collectors.toList()));
        }

        // Fallback for non-subadmins
        String reqCityFallback = city != null ? city.trim() : "";
        if (area != null && !area.isBlank()) {
            return toProjectResponses(projectRepository.findByCityIgnoreCaseAndAreaIgnoreCase(reqCityFallback, area.trim()));
        }
        return toProjectResponses(projectRepository.findByCityIgnoreCase(reqCityFallback));
    }

    private int defaultInt(Integer value) {
        return value != null ? value : 0;
    }



    /**
     * If the project's city has sub-area locations configured in the DB,
     * the project MUST have a non-blank area. Throws 400 otherwise.
     */
    private void enforceAreaForCity(Project project) {
        String city = project.getCity();
        if (city == null || city.isBlank()) return; // no city → skip
        String area = project.getArea();
        if (area != null && !area.isBlank()) return; // area already set → OK
        boolean cityHasAreas = false;
        if (cityHasAreas) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Area selection is optional for city-level projects."
            );
        }
    }

    @Transactional
    public void updateCoverPhotoUrl(Long projectId, String coverPhotoUrl) {
        Project project = findProjectEntity(projectId);
        ensureCanModifyProject(project);
        project.setCoverPhotoUrl(coverPhotoUrl);
        projectRepository.save(project);
    }
}
