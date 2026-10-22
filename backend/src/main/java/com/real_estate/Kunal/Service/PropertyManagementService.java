package com.real_estate.Kunal.Service;

import com.real_estate.Kunal.DTO.*;
import com.real_estate.Kunal.Entity.*;
import com.real_estate.Kunal.Repository.*;
import com.real_estate.Kunal.Security.FileUploadSecurityValidator;
import com.real_estate.Kunal.Security.SignedMediaUrlService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class PropertyManagementService {

    private final ProjectRepository projectRepository;
    private final BuildingRepository buildingRepository;
    private final FloorRepository floorRepository;
    private final PropertyUnitRepository propertyUnitRepository;
    private final UnitDocumentRepository unitDocumentRepository;
    private final UserRepository userRepository;
    private final ObjectStorageService objectStorageService;
    private final FileUploadSecurityValidator fileUploadSecurityValidator;
    private final SignedMediaUrlService signedMediaUrlService;

    // ==========================================
    // BUILDINGS
    // ==========================================

    @Transactional(readOnly = true)
    public List<BuildingResponse> getBuildings(Long propertyId) {
        validateProject(propertyId);
        List<Building> buildings = buildingRepository.findByProjectIdOrderByIdAsc(propertyId);
        return buildings.stream()
                .map(this::toBuildingResponse)
                .toList();
    }

    @Transactional
    public BuildingResponse createBuilding(Long propertyId, BuildingRequest request) {
        Project project = validateProject(propertyId);

        String name = request.getName().trim();
        if (buildingRepository.existsByProjectIdAndNameIgnoreCase(propertyId, name)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Building with name '" + name + "' already exists in this property");
        }

        int totalFloors = request.getTotalFloors() != null && request.getTotalFloors() > 0 ? request.getTotalFloors() : 1;
        String bType = request.getBuildingType() != null && !request.getBuildingType().isBlank()
                ? request.getBuildingType().trim() : "MIXED_USE";

        Building building = Building.builder()
                .projectId(propertyId)
                .name(name)
                .towerCode(request.getTowerCode())
                .buildingType(bType)
                .totalFloors(totalFloors)
                .description(request.getDescription())
                .build();

        Building saved = buildingRepository.save(building);

        // Automatically pre-configure standard floors (Ground Floor + floors 1..N-1) for convenience
        for (int i = 0; i < totalFloors; i++) {
            String floorName = i == 0 ? "Ground Floor" : "Floor " + i;
            Floor floor = Floor.builder()
                    .projectId(propertyId)
                    .buildingId(saved.getId())
                    .floorNumber(i)
                    .floorName(floorName)
                    .floorType("MIXED")
                    .totalUnits(0)
                    .build();
            floorRepository.save(floor);
        }

        return toBuildingResponse(saved);
    }

    @Transactional(readOnly = true)
    public BuildingResponse getBuilding(Long propertyId, Long buildingId) {
        validateProject(propertyId);
        Building building = buildingRepository.findByIdAndProjectId(buildingId, propertyId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Building not found"));
        return toBuildingResponse(building);
    }

    @Transactional
    public BuildingResponse updateBuilding(Long propertyId, Long buildingId, BuildingRequest request) {
        validateProject(propertyId);
        Building building = buildingRepository.findByIdAndProjectId(buildingId, propertyId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Building not found"));

        String name = request.getName().trim();
        if (!building.getName().equalsIgnoreCase(name)
                && buildingRepository.existsByProjectIdAndNameIgnoreCase(propertyId, name)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Building with name '" + name + "' already exists in this property");
        }

        building.setName(name);
        if (request.getTowerCode() != null) {
            building.setTowerCode(request.getTowerCode().trim());
        }
        if (request.getBuildingType() != null) {
            building.setBuildingType(request.getBuildingType().trim());
        }
        if (request.getTotalFloors() != null && request.getTotalFloors() > 0) {
            building.setTotalFloors(request.getTotalFloors());
        }
        if (request.getDescription() != null) {
            building.setDescription(request.getDescription());
        }

        return toBuildingResponse(buildingRepository.save(building));
    }

    @Transactional
    public void deleteBuilding(Long propertyId, Long buildingId) {
        validateProject(propertyId);
        Building building = buildingRepository.findByIdAndProjectId(buildingId, propertyId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Building not found"));

        buildingRepository.delete(building);
    }

    // ==========================================
    // FLOORS
    // ==========================================

    @Transactional(readOnly = true)
    public List<FloorResponse> getFloors(Long propertyId, Long buildingId) {
        validateBuilding(propertyId, buildingId);
        List<Floor> floors = floorRepository.findByBuildingIdOrderByFloorNumberAsc(buildingId);
        return floors.stream()
                .map(this::toFloorResponse)
                .toList();
    }

    @Transactional
    public FloorResponse createFloor(Long propertyId, Long buildingId, FloorRequest request) {
        Building building = validateBuilding(propertyId, buildingId);

        if (floorRepository.existsByBuildingIdAndFloorNumber(buildingId, request.getFloorNumber())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Floor number " + request.getFloorNumber() + " already exists in building " + building.getName());
        }

        String floorName = request.getFloorName().trim();
        String floorType = request.getFloorType() != null && !request.getFloorType().isBlank()
                ? request.getFloorType().trim() : "MIXED";

        Floor floor = Floor.builder()
                .projectId(propertyId)
                .buildingId(buildingId)
                .floorNumber(request.getFloorNumber())
                .floorName(floorName)
                .floorType(floorType)
                .totalUnits(0)
                .build();

        Floor saved = floorRepository.save(floor);

        // Update building floor count if floor number exceeds totalFloors
        long currentFloorsCount = floorRepository.countByBuildingId(buildingId);
        if (currentFloorsCount > building.getTotalFloors()) {
            building.setTotalFloors((int) currentFloorsCount);
            buildingRepository.save(building);
        }

        return toFloorResponse(saved);
    }

    @Transactional(readOnly = true)
    public FloorResponse getFloor(Long propertyId, Long buildingId, Long floorId) {
        validateBuilding(propertyId, buildingId);
        Floor floor = floorRepository.findByIdAndBuildingId(floorId, buildingId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Floor not found"));
        return toFloorResponse(floor);
    }

    @Transactional
    public FloorResponse updateFloor(Long propertyId, Long buildingId, Long floorId, FloorRequest request) {
        validateBuilding(propertyId, buildingId);
        Floor floor = floorRepository.findByIdAndBuildingId(floorId, buildingId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Floor not found"));

        if (!floor.getFloorNumber().equals(request.getFloorNumber())
                && floorRepository.existsByBuildingIdAndFloorNumber(buildingId, request.getFloorNumber())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Floor number " + request.getFloorNumber() + " already exists in this building");
        }

        floor.setFloorNumber(request.getFloorNumber());
        floor.setFloorName(request.getFloorName().trim());
        if (request.getFloorType() != null && !request.getFloorType().isBlank()) {
            floor.setFloorType(request.getFloorType().trim());
        }

        return toFloorResponse(floorRepository.save(floor));
    }

    @Transactional
    public void deleteFloor(Long propertyId, Long buildingId, Long floorId) {
        validateBuilding(propertyId, buildingId);
        Floor floor = floorRepository.findByIdAndBuildingId(floorId, buildingId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Floor not found"));

        floorRepository.delete(floor);
    }

    // ==========================================
    // UNITS (FLATS, SHOPS, OFFICES, ETC.)
    // ==========================================

    @Transactional(readOnly = true)
    public List<PropertyUnitResponse> getUnits(Long propertyId, Long buildingId, Long floorId, String unitType, String status) {
        validateProject(propertyId);
        List<PropertyUnit> units;
        if (floorId != null) {
            units = propertyUnitRepository.findByFloorIdOrderByUnitNumberAsc(floorId);
        } else if (buildingId != null) {
            units = propertyUnitRepository.findByBuildingIdOrderByFloorIdAscUnitNumberAsc(buildingId);
        } else {
            units = propertyUnitRepository.findByPropertyProjectIdOrderByBuildingIdAscFloorIdAscUnitNumberAsc(propertyId);
        }

        return units.stream()
                .filter(u -> unitType == null || unitType.isBlank() || "all".equalsIgnoreCase(unitType) || u.getUnitType().equalsIgnoreCase(unitType.trim()))
                .filter(u -> status == null || status.isBlank() || "all".equalsIgnoreCase(status) || u.getStatus().equalsIgnoreCase(status.trim()))
                .map(this::toPropertyUnitResponse)
                .toList();
    }

    @Transactional
    public PropertyUnitResponse createUnit(Long propertyId, Long buildingId, Long floorId, PropertyUnitRequest request) {
        validateProject(propertyId);
        Building building = validateBuilding(propertyId, buildingId != null ? buildingId : request.getBuildingId());
        Long targetBuildingId = building.getId();
        Long targetFloorId = floorId != null ? floorId : request.getFloorId();

        if (targetFloorId == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Floor ID is required");
        }

        Floor floor = floorRepository.findByIdAndBuildingId(targetFloorId, targetBuildingId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Floor not found in specified building"));

        String unitNumber = request.getUnitNumber().trim();
        if (propertyUnitRepository.existsByFloorIdAndUnitNumberIgnoreCase(targetFloorId, unitNumber)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Unit '" + unitNumber + "' already exists on floor " + floor.getFloorName());
        }

        String unitType = request.getUnitType().trim().toUpperCase(Locale.ROOT);
        String status = request.getStatus() != null && !request.getStatus().isBlank()
                ? request.getStatus().trim().toUpperCase(Locale.ROOT) : "AVAILABLE";

        PropertyUnit unit = PropertyUnit.builder()
                .propertyProjectId(propertyId)
                .buildingId(targetBuildingId)
                .floorId(targetFloorId)
                .unitNumber(unitNumber)
                .unitType(unitType)
                .subType(request.getSubType() != null ? request.getSubType().trim() : null)
                .carpetArea(request.getCarpetArea())
                .carpetAreaUnit(request.getCarpetAreaUnit() != null ? request.getCarpetAreaUnit().trim() : "sq_ft")
                .builtUpArea(request.getBuiltUpArea())
                .builtUpAreaUnit(request.getBuiltUpAreaUnit() != null ? request.getBuiltUpAreaUnit().trim() : "sq_ft")
                .superBuiltUpArea(request.getSuperBuiltUpArea())
                .bedrooms(request.getBedrooms())
                .bathrooms(request.getBathrooms())
                .balconies(request.getBalconies())
                .parkingSpaces(request.getParkingSpaces())
                .facing(request.getFacing() != null ? request.getFacing().trim() : null)
                .price(request.getPrice())
                .rentPrice(request.getRentPrice())
                .status(status)
                .ownerName(request.getOwnerName() != null ? request.getOwnerName().trim() : null)
                .ownerPhone(request.getOwnerPhone() != null ? request.getOwnerPhone().trim() : null)
                .ownerEmail(request.getOwnerEmail() != null ? request.getOwnerEmail().trim() : null)
                .description(request.getDescription())
                .coverImageUrl(request.getCoverImageUrl())
                .floorPlanUrl(request.getFloorPlanUrl())
                .build();

        PropertyUnit saved = propertyUnitRepository.save(unit);

        // Update floor units counter
        floor.setTotalUnits((int) propertyUnitRepository.countByFloorId(targetFloorId));
        floorRepository.save(floor);

        return toPropertyUnitResponse(saved);
    }

    @Transactional(readOnly = true)
    public PropertyUnitResponse getUnit(Long propertyId, Long unitId) {
        validateProject(propertyId);
        PropertyUnit unit = propertyUnitRepository.findByIdAndPropertyProjectId(unitId, propertyId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Unit not found in specified property"));
        PropertyUnitResponse response = toPropertyUnitResponse(unit);
        response.setDocuments(getUnitDocuments(propertyId, unitId));
        return response;
    }

    @Transactional
    public PropertyUnitResponse updateUnit(Long propertyId, Long unitId, PropertyUnitRequest request) {
        validateProject(propertyId);
        PropertyUnit unit = propertyUnitRepository.findByIdAndPropertyProjectId(unitId, propertyId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Unit not found in specified property"));

        String unitNumber = request.getUnitNumber().trim();
        if (!unit.getUnitNumber().equalsIgnoreCase(unitNumber)
                && propertyUnitRepository.existsByFloorIdAndUnitNumberIgnoreCase(unit.getFloorId(), unitNumber)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Unit '" + unitNumber + "' already exists on this floor");
        }

        unit.setUnitNumber(unitNumber);
        if (request.getUnitType() != null && !request.getUnitType().isBlank()) {
            unit.setUnitType(request.getUnitType().trim().toUpperCase(Locale.ROOT));
        }
        if (request.getSubType() != null) unit.setSubType(request.getSubType().trim());
        if (request.getCarpetArea() != null) unit.setCarpetArea(request.getCarpetArea());
        if (request.getCarpetAreaUnit() != null) unit.setCarpetAreaUnit(request.getCarpetAreaUnit().trim());
        if (request.getBuiltUpArea() != null) unit.setBuiltUpArea(request.getBuiltUpArea());
        if (request.getBuiltUpAreaUnit() != null) unit.setBuiltUpAreaUnit(request.getBuiltUpAreaUnit().trim());
        if (request.getSuperBuiltUpArea() != null) unit.setSuperBuiltUpArea(request.getSuperBuiltUpArea());
        if (request.getBedrooms() != null) unit.setBedrooms(request.getBedrooms());
        if (request.getBathrooms() != null) unit.setBathrooms(request.getBathrooms());
        if (request.getBalconies() != null) unit.setBalconies(request.getBalconies());
        if (request.getParkingSpaces() != null) unit.setParkingSpaces(request.getParkingSpaces());
        if (request.getFacing() != null) unit.setFacing(request.getFacing().trim());
        if (request.getPrice() != null) unit.setPrice(request.getPrice());
        if (request.getRentPrice() != null) unit.setRentPrice(request.getRentPrice());
        if (request.getStatus() != null && !request.getStatus().isBlank()) {
            unit.setStatus(request.getStatus().trim().toUpperCase(Locale.ROOT));
        }
        if (request.getOwnerName() != null) unit.setOwnerName(request.getOwnerName().trim());
        if (request.getOwnerPhone() != null) unit.setOwnerPhone(request.getOwnerPhone().trim());
        if (request.getOwnerEmail() != null) unit.setOwnerEmail(request.getOwnerEmail().trim());
        if (request.getDescription() != null) unit.setDescription(request.getDescription());
        if (request.getCoverImageUrl() != null) unit.setCoverImageUrl(request.getCoverImageUrl());
        if (request.getFloorPlanUrl() != null) unit.setFloorPlanUrl(request.getFloorPlanUrl());

        PropertyUnit saved = propertyUnitRepository.save(unit);
        return toPropertyUnitResponse(saved);
    }

    @Transactional
    public void deleteUnit(Long propertyId, Long unitId) {
        validateProject(propertyId);
        PropertyUnit unit = propertyUnitRepository.findByIdAndPropertyProjectId(unitId, propertyId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Unit not found in specified property"));

        Long floorId = unit.getFloorId();
        propertyUnitRepository.delete(unit);

        floorRepository.findById(floorId).ifPresent(f -> {
            f.setTotalUnits((int) propertyUnitRepository.countByFloorId(floorId));
            floorRepository.save(f);
        });
    }

    // ==========================================
    // UNIT DOCUMENTS
    // ==========================================

    @Transactional(readOnly = true)
    public List<UnitDocumentResponse> getUnitDocuments(Long propertyId, Long unitId) {
        validateUnit(propertyId, unitId);
        List<UnitDocument> documents = unitDocumentRepository.findByUnitIdOrderByCreatedAtDesc(unitId);
        return documents.stream()
                .map(this::toUnitDocumentResponse)
                .toList();
    }

    @Transactional
    public UnitDocumentResponse uploadUnitDocument(
            Long propertyId,
            Long unitId,
            String documentName,
            String documentType,
            String description,
            MultipartFile file
    ) throws IOException {
        PropertyUnit unit = validateUnit(propertyId, unitId);

        if (file == null || file.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "File is empty or missing");
        }

        String originalName = file.getOriginalFilename() != null ? file.getOriginalFilename() : "document.pdf";
        String safeName = objectStorageService.sanitizeFileName(originalName);

        // Security check file extension and content
        FileUploadSecurityValidator.ValidatedUpload validated =
                fileUploadSecurityValidator.validateProjectDocument(file, safeName);

        String storedPath = objectStorageService.storeUnitDocument(
                file, propertyId, unitId, safeName, validated.contentType());

        String docName = (documentName != null && !documentName.isBlank()) ? documentName.trim() : safeName;
        String docType = (documentType != null && !documentType.isBlank())
                ? documentType.trim().toUpperCase(Locale.ROOT) : "OTHER";

        UnitDocument doc = UnitDocument.builder()
                .propertyProjectId(propertyId)
                .buildingId(unit.getBuildingId())
                .floorId(unit.getFloorId())
                .unitId(unitId)
                .documentName(docName)
                .documentType(docType)
                .objectKey(storedPath)
                .filePath(storedPath)
                .fileSize(file.getSize())
                .contentType(validated.contentType())
                .uploadedBy(currentUserId())
                .description(description)
                .version(1)
                .build();

        UnitDocument saved = unitDocumentRepository.save(doc);
        return toUnitDocumentResponse(saved);
    }

    @Transactional(readOnly = true)
    public UnitDocumentResponse getUnitDocument(Long propertyId, Long unitId, Long documentId) {
        validateUnit(propertyId, unitId);
        UnitDocument doc = unitDocumentRepository.findByIdAndUnitId(documentId, unitId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Document not found"));
        return toUnitDocumentResponse(doc);
    }

    @Transactional
    public void deleteUnitDocument(Long propertyId, Long unitId, Long documentId) {
        validateUnit(propertyId, unitId);
        UnitDocument doc = unitDocumentRepository.findByIdAndUnitId(documentId, unitId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Document not found"));

        try {
            objectStorageService.deleteProjectDocument(doc.getFilePath());
        } catch (Exception ex) {
            log.warn("Failed to delete physical file {}: {}", doc.getFilePath(), ex.getMessage());
        }

        unitDocumentRepository.delete(doc);
    }

    @Transactional(readOnly = true)
    public ObjectStorageService.StoredObject downloadUnitDocument(Long propertyId, Long unitId, Long documentId) throws IOException {
        validateUnit(propertyId, unitId);
        UnitDocument doc = unitDocumentRepository.findByIdAndUnitId(documentId, unitId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Document not found"));

        return objectStorageService.loadProjectDocument(doc.getFilePath());
    }

    // ==========================================
    // HIERARCHY & DASHBOARD SUMMARY
    // ==========================================

    @Transactional(readOnly = true)
    public PropertyHierarchyResponse getPropertyHierarchy(Long propertyId) {
        Project project = validateProject(propertyId);

        long totalBuildings = buildingRepository.countByProjectId(propertyId);
        long totalFloors = floorRepository.countByProjectId(propertyId);
        long totalResidentialUnits = propertyUnitRepository.countResidentialUnits(propertyId);
        long totalCommercialUnits = propertyUnitRepository.countCommercialUnits(propertyId);
        long availableUnits = propertyUnitRepository.countByPropertyProjectIdAndStatusIgnoreCase(propertyId, "AVAILABLE");
        long reservedUnits = propertyUnitRepository.countByPropertyProjectIdAndStatusIgnoreCase(propertyId, "RESERVED");
        long soldUnits = propertyUnitRepository.countByPropertyProjectIdAndStatusIgnoreCase(propertyId, "SOLD");
        long rentedUnits = propertyUnitRepository.countByPropertyProjectIdAndStatusIgnoreCase(propertyId, "RENTED");
        long totalUnits = propertyUnitRepository.countByPropertyProjectId(propertyId);

        List<Building> buildings = buildingRepository.findByProjectIdOrderByIdAsc(propertyId);
        List<BuildingResponse> buildingResponses = buildings.stream().map(b -> {
            BuildingResponse bResp = toBuildingResponse(b);
            List<Floor> floors = floorRepository.findByBuildingIdOrderByFloorNumberAsc(b.getId());
            List<FloorResponse> floorResponses = floors.stream().map(f -> {
                FloorResponse fResp = toFloorResponse(f);
                List<PropertyUnit> units = propertyUnitRepository.findByFloorIdOrderByUnitNumberAsc(f.getId());
                fResp.setUnits(units.stream().map(this::toPropertyUnitResponse).toList());
                return fResp;
            }).toList();
            bResp.setFloors(floorResponses);
            return bResp;
        }).toList();

        return PropertyHierarchyResponse.builder()
                .propertyId(project.getId())
                .propertyName(project.getProjectName())
                .propertyCode(project.getPropertyCode())
                .propertyType(project.getPropertyType())
                .city(project.getCity())
                .area(project.getArea())
                .status(project.getStatus())
                .totalBuildings(totalBuildings)
                .totalFloors(totalFloors)
                .totalResidentialUnits(totalResidentialUnits)
                .totalCommercialUnits(totalCommercialUnits)
                .availableUnits(availableUnits)
                .reservedUnits(reservedUnits)
                .soldUnits(soldUnits)
                .rentedUnits(rentedUnits)
                .totalUnits(totalUnits)
                .buildings(buildingResponses)
                .build();
    }

    // ==========================================
    // HELPERS & MAPPERS
    // ==========================================

    private Project validateProject(Long projectId) {
        return projectRepository.findById(projectId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Property project not found"));
    }

    private Building validateBuilding(Long propertyId, Long buildingId) {
        validateProject(propertyId);
        return buildingRepository.findByIdAndProjectId(buildingId, propertyId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Building not found in property"));
    }

    private PropertyUnit validateUnit(Long propertyId, Long unitId) {
        validateProject(propertyId);
        return propertyUnitRepository.findByIdAndPropertyProjectId(unitId, propertyId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Unit not found in property"));
    }

    private BuildingResponse toBuildingResponse(Building b) {
        long configuredFloors = floorRepository.countByBuildingId(b.getId());
        long totalUnits = propertyUnitRepository.countByBuildingId(b.getId());

        return BuildingResponse.builder()
                .id(b.getId())
                .projectId(b.getProjectId())
                .name(b.getName())
                .towerCode(b.getTowerCode())
                .buildingType(b.getBuildingType())
                .totalFloors(b.getTotalFloors())
                .description(b.getDescription())
                .configuredFloors((int) configuredFloors)
                .totalUnits((int) totalUnits)
                .createdAt(b.getCreatedAt())
                .updatedAt(b.getUpdatedAt())
                .build();
    }

    private FloorResponse toFloorResponse(Floor f) {
        String buildingName = buildingRepository.findById(f.getBuildingId())
                .map(Building::getName).orElse(null);

        return FloorResponse.builder()
                .id(f.getId())
                .projectId(f.getProjectId())
                .buildingId(f.getBuildingId())
                .buildingName(buildingName)
                .floorNumber(f.getFloorNumber())
                .floorName(f.getFloorName())
                .floorType(f.getFloorType())
                .totalUnits(f.getTotalUnits())
                .createdAt(f.getCreatedAt())
                .updatedAt(f.getUpdatedAt())
                .build();
    }

    private PropertyUnitResponse toPropertyUnitResponse(PropertyUnit u) {
        String buildingName = buildingRepository.findById(u.getBuildingId())
                .map(Building::getName).orElse(null);
        Floor floor = floorRepository.findById(u.getFloorId()).orElse(null);
        String projectName = projectRepository.findById(u.getPropertyProjectId())
                .map(Project::getProjectName).orElse(null);
        long docCount = unitDocumentRepository.countByUnitId(u.getId());

        return PropertyUnitResponse.builder()
                .id(u.getId())
                .propertyProjectId(u.getPropertyProjectId())
                .projectName(projectName)
                .buildingId(u.getBuildingId())
                .buildingName(buildingName)
                .floorId(u.getFloorId())
                .floorName(floor != null ? floor.getFloorName() : null)
                .floorNumber(floor != null ? floor.getFloorNumber() : null)
                .unitNumber(u.getUnitNumber())
                .unitType(u.getUnitType())
                .subType(u.getSubType())
                .carpetArea(u.getCarpetArea())
                .carpetAreaUnit(u.getCarpetAreaUnit())
                .builtUpArea(u.getBuiltUpArea())
                .builtUpAreaUnit(u.getBuiltUpAreaUnit())
                .superBuiltUpArea(u.getSuperBuiltUpArea())
                .bedrooms(u.getBedrooms())
                .bathrooms(u.getBathrooms())
                .balconies(u.getBalconies())
                .parkingSpaces(u.getParkingSpaces())
                .facing(u.getFacing())
                .price(u.getPrice())
                .rentPrice(u.getRentPrice())
                .status(u.getStatus())
                .ownerName(u.getOwnerName())
                .ownerPhone(u.getOwnerPhone())
                .ownerEmail(u.getOwnerEmail())
                .description(u.getDescription())
                .coverImageUrl(u.getCoverImageUrl())
                .floorPlanUrl(u.getFloorPlanUrl())
                .documentCount((int) docCount)
                .createdAt(u.getCreatedAt())
                .updatedAt(u.getUpdatedAt())
                .build();
    }

    private UnitDocumentResponse toUnitDocumentResponse(UnitDocument d) {
        String downloadUrl = "/api/properties/" + d.getPropertyProjectId()
                + "/units/" + d.getUnitId() + "/documents/" + d.getId() + "/download";

        return UnitDocumentResponse.builder()
                .id(d.getId())
                .propertyProjectId(d.getPropertyProjectId())
                .buildingId(d.getBuildingId())
                .floorId(d.getFloorId())
                .unitId(d.getUnitId())
                .documentName(d.getDocumentName())
                .documentType(d.getDocumentType())
                .filePath(d.getFilePath())
                .fileUrl(signedMediaUrlService.signPath(downloadUrl))
                .fileSize(d.getFileSize())
                .contentType(d.getContentType())
                .uploadedBy(d.getUploadedBy())
                .description(d.getDescription())
                .version(d.getVersion())
                .createdAt(d.getCreatedAt())
                .updatedAt(d.getUpdatedAt())
                .build();
    }

    private Long currentUserId() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || "anonymousUser".equals(auth.getPrincipal())) return null;
        try {
            return Long.parseLong(auth.getName());
        } catch (NumberFormatException ignored) {
            return userRepository.findByEmail(auth.getName()).map(User::getId).orElse(null);
        }
    }
}
