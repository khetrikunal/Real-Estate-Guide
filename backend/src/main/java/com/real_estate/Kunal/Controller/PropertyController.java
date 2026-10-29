package com.real_estate.Kunal.Controller;

import com.real_estate.Kunal.DTO.*;
import com.real_estate.Kunal.Service.ObjectStorageService;
import com.real_estate.Kunal.Service.ProjectService;
import com.real_estate.Kunal.Service.PropertyManagementService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;

@RestController
@RequestMapping("/api/properties")
@RequiredArgsConstructor
public class PropertyController {

    private final ProjectService projectService;
    private final PropertyManagementService propertyManagementService;

    // ==========================================
    // PROPERTIES (PROJECTS)
    // ==========================================

    @GetMapping
    public List<ProjectResponse> getAllProperties() {
        return projectService.getAllProjects();
    }

    @PostMapping
    public ProjectResponse createProperty(@Valid @RequestBody ProjectRequest request) {
        return projectService.createProject(request);
    }

    @GetMapping("/{propertyId}")
    public ProjectResponse getPropertyById(@PathVariable("propertyId") Long propertyId) {
        return projectService.getProjectById(propertyId);
    }

    @PatchMapping("/{propertyId}")
    public ProjectResponse patchProperty(
            @PathVariable("propertyId") Long propertyId,
            @Valid @RequestBody ProjectRequest request
    ) {
        return projectService.updateProject(propertyId, request);
    }

    @DeleteMapping("/{propertyId}")
    public void deleteProperty(@PathVariable("propertyId") Long propertyId) {
        projectService.deleteProject(propertyId);
    }

    @GetMapping("/{propertyId}/hierarchy")
    public PropertyHierarchyResponse getPropertyHierarchy(@PathVariable("propertyId") Long propertyId) {
        return propertyManagementService.getPropertyHierarchy(propertyId);
    }

    // ==========================================
    // BUILDINGS
    // ==========================================

    @GetMapping("/{propertyId}/buildings")
    public List<BuildingResponse> getBuildings(@PathVariable("propertyId") Long propertyId) {
        return propertyManagementService.getBuildings(propertyId);
    }

    @PostMapping("/{propertyId}/buildings")
    public BuildingResponse createBuilding(
            @PathVariable("propertyId") Long propertyId,
            @Valid @RequestBody BuildingRequest request
    ) {
        return propertyManagementService.createBuilding(propertyId, request);
    }

    @GetMapping("/{propertyId}/buildings/{buildingId}")
    public BuildingResponse getBuilding(
            @PathVariable("propertyId") Long propertyId,
            @PathVariable("buildingId") Long buildingId
    ) {
        return propertyManagementService.getBuilding(propertyId, buildingId);
    }

    @PatchMapping("/{propertyId}/buildings/{buildingId}")
    public BuildingResponse updateBuilding(
            @PathVariable("propertyId") Long propertyId,
            @PathVariable("buildingId") Long buildingId,
            @Valid @RequestBody BuildingRequest request
    ) {
        return propertyManagementService.updateBuilding(propertyId, buildingId, request);
    }

    @DeleteMapping("/{propertyId}/buildings/{buildingId}")
    public void deleteBuilding(
            @PathVariable("propertyId") Long propertyId,
            @PathVariable("buildingId") Long buildingId
    ) {
        propertyManagementService.deleteBuilding(propertyId, buildingId);
    }

    // ==========================================
    // FLOORS
    // ==========================================

    @GetMapping("/{propertyId}/buildings/{buildingId}/floors")
    public List<FloorResponse> getFloors(
            @PathVariable("propertyId") Long propertyId,
            @PathVariable("buildingId") Long buildingId
    ) {
        return propertyManagementService.getFloors(propertyId, buildingId);
    }

    @PostMapping("/{propertyId}/buildings/{buildingId}/floors")
    public FloorResponse createFloor(
            @PathVariable("propertyId") Long propertyId,
            @PathVariable("buildingId") Long buildingId,
            @Valid @RequestBody FloorRequest request
    ) {
        return propertyManagementService.createFloor(propertyId, buildingId, request);
    }

    @GetMapping("/{propertyId}/buildings/{buildingId}/floors/{floorId}")
    public FloorResponse getFloor(
            @PathVariable("propertyId") Long propertyId,
            @PathVariable("buildingId") Long buildingId,
            @PathVariable("floorId") Long floorId
    ) {
        return propertyManagementService.getFloor(propertyId, buildingId, floorId);
    }

    @PatchMapping("/{propertyId}/buildings/{buildingId}/floors/{floorId}")
    public FloorResponse updateFloor(
            @PathVariable("propertyId") Long propertyId,
            @PathVariable("buildingId") Long buildingId,
            @PathVariable("floorId") Long floorId,
            @Valid @RequestBody FloorRequest request
    ) {
        return propertyManagementService.updateFloor(propertyId, buildingId, floorId, request);
    }

    @DeleteMapping("/{propertyId}/buildings/{buildingId}/floors/{floorId}")
    public void deleteFloor(
            @PathVariable("propertyId") Long propertyId,
            @PathVariable("buildingId") Long buildingId,
            @PathVariable("floorId") Long floorId
    ) {
        propertyManagementService.deleteFloor(propertyId, buildingId, floorId);
    }

    // ==========================================
    // UNITS (FLATS, SHOPS, OFFICES, ETC.)
    // ==========================================

    @GetMapping("/{propertyId}/buildings/{buildingId}/floors/{floorId}/units")
    public List<PropertyUnitResponse> getUnitsForFloor(
            @PathVariable("propertyId") Long propertyId,
            @PathVariable("buildingId") Long buildingId,
            @PathVariable("floorId") Long floorId,
            @RequestParam(value = "unitType", required = false) String unitType,
            @RequestParam(value = "status", required = false) String status
    ) {
        return propertyManagementService.getUnits(propertyId, buildingId, floorId, unitType, status);
    }

    @PostMapping("/{propertyId}/buildings/{buildingId}/floors/{floorId}/units")
    public PropertyUnitResponse createUnit(
            @PathVariable("propertyId") Long propertyId,
            @PathVariable("buildingId") Long buildingId,
            @PathVariable("floorId") Long floorId,
            @Valid @RequestBody PropertyUnitRequest request
    ) {
        return propertyManagementService.createUnit(propertyId, buildingId, floorId, request);
    }

    @GetMapping("/{propertyId}/units")
    public List<PropertyUnitResponse> getAllUnits(
            @PathVariable("propertyId") Long propertyId,
            @RequestParam(value = "buildingId", required = false) Long buildingId,
            @RequestParam(value = "floorId", required = false) Long floorId,
            @RequestParam(value = "unitType", required = false) String unitType,
            @RequestParam(value = "status", required = false) String status
    ) {
        return propertyManagementService.getUnits(propertyId, buildingId, floorId, unitType, status);
    }

    @GetMapping("/{propertyId}/units/{unitId}")
    public PropertyUnitResponse getUnit(
            @PathVariable("propertyId") Long propertyId,
            @PathVariable("unitId") Long unitId
    ) {
        return propertyManagementService.getUnit(propertyId, unitId);
    }

    @PatchMapping("/{propertyId}/units/{unitId}")
    public PropertyUnitResponse updateUnit(
            @PathVariable("propertyId") Long propertyId,
            @PathVariable("unitId") Long unitId,
            @Valid @RequestBody PropertyUnitRequest request
    ) {
        return propertyManagementService.updateUnit(propertyId, unitId, request);
    }

    @DeleteMapping("/{propertyId}/units/{unitId}")
    public void deleteUnit(
            @PathVariable("propertyId") Long propertyId,
            @PathVariable("unitId") Long unitId
    ) {
        propertyManagementService.deleteUnit(propertyId, unitId);
    }

    // ==========================================
    // UNIT DOCUMENTS
    // ==========================================

    @GetMapping("/{propertyId}/units/{unitId}/documents")
    public List<UnitDocumentResponse> getUnitDocuments(
            @PathVariable("propertyId") Long propertyId,
            @PathVariable("unitId") Long unitId
    ) {
        return propertyManagementService.getUnitDocuments(propertyId, unitId);
    }

    @PostMapping(value = "/{propertyId}/units/{unitId}/documents", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public UnitDocumentResponse uploadUnitDocument(
            @PathVariable("propertyId") Long propertyId,
            @PathVariable("unitId") Long unitId,
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "documentName", required = false) String documentName,
            @RequestParam(value = "documentType", required = false) String documentType,
            @RequestParam(value = "description", required = false) String description
    ) throws IOException {
        return propertyManagementService.uploadUnitDocument(
                propertyId, unitId, documentName, documentType, description, file);
    }

    @GetMapping("/{propertyId}/units/{unitId}/documents/{documentId}")
    public UnitDocumentResponse getUnitDocument(
            @PathVariable("propertyId") Long propertyId,
            @PathVariable("unitId") Long unitId,
            @PathVariable("documentId") Long documentId
    ) {
        return propertyManagementService.getUnitDocument(propertyId, unitId, documentId);
    }

    @DeleteMapping("/{propertyId}/units/{unitId}/documents/{documentId}")
    public void deleteUnitDocument(
            @PathVariable("propertyId") Long propertyId,
            @PathVariable("unitId") Long unitId,
            @PathVariable("documentId") Long documentId
    ) {
        propertyManagementService.deleteUnitDocument(propertyId, unitId, documentId);
    }

    @GetMapping("/{propertyId}/units/{unitId}/documents/{documentId}/download")
    public ResponseEntity<ByteArrayResource> downloadUnitDocument(
            @PathVariable("propertyId") Long propertyId,
            @PathVariable("unitId") Long unitId,
            @PathVariable("documentId") Long documentId,
            @RequestParam(value = "exp", required = false) Long exp,
            @RequestParam(value = "sig", required = false) String sig,
            java.security.Principal principal
    ) throws IOException {
        ObjectStorageService.StoredObject stored = principal != null
                ? propertyManagementService.downloadUnitDocument(propertyId, unitId, documentId)
                : propertyManagementService.downloadSignedUnitDocument(propertyId, unitId, documentId, exp, sig);

        MediaType mediaType;
        try {
            mediaType = MediaType.parseMediaType(stored.contentType());
        } catch (Exception ex) {
            mediaType = MediaType.APPLICATION_OCTET_STREAM;
        }

        return ResponseEntity.ok()
                .contentType(mediaType)
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"document-" + documentId + "\"")
                .body(new ByteArrayResource(stored.bytes()));
    }
}
