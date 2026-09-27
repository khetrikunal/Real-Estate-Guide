package com.real_estate.Kunal.Controller;

import com.real_estate.Kunal.Entity.Area;
import com.real_estate.Kunal.Repository.AreaRepository;

import lombok.RequiredArgsConstructor;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/areas")
@RequiredArgsConstructor
public class AreaController {

    private final AreaRepository areaRepository;

    /**
     * GET /api/areas?city=Baramati
     * Returns all areas for a given city.
     */
    @GetMapping
    public List<Area> getAreasByCity(@RequestParam(required = false) String city,
                                     @RequestParam(required = false) String state) {
        if (city == null || city.isBlank()) {
            return areaRepository.findAll();
        }
        if (state != null && !state.isBlank()) {
            return areaRepository.findByCityIgnoreCaseAndStateIgnoreCase(city, state);
        }
        return areaRepository.findByCityIgnoreCase(city);
    }

    /**
     * POST /api/areas
     * Body: { "name": "Phadke Haud", "city": "Baramati" }
     * State defaults to Maharashtra.
     */
    @PostMapping
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<?> addArea(@RequestBody Map<String, String> body) {
        String name = body.get("name") != null ? body.get("name").trim() : "";
        String city = body.get("city") != null ? body.get("city").trim() : "";
        String state = body.get("state") != null ? body.get("state").trim() : "Maharashtra";

        if (name.isEmpty() || city.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Area name and city are required");
        }

        if (areaRepository.existsByNameIgnoreCaseAndCityIgnoreCaseAndStateIgnoreCase(name, city, state)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Area already exists for this city");
        }

        Double subscriptionRate = null;
        if (body.get("subscriptionRate") != null && !body.get("subscriptionRate").isBlank()) {
            try {
                subscriptionRate = Double.parseDouble(body.get("subscriptionRate").trim());
            } catch (NumberFormatException ignored) {}
        }

        Area area = Area.builder()
                .name(name)
                .city(city)
                .state(state)
                .subscriptionRate(subscriptionRate)
                .active(true)
                .build();
        areaRepository.save(area);

        return ResponseEntity.ok(area);
    }

    /**
     * PATCH /api/areas/{id}/toggle-active
     * SuperAdmin toggles area active status.
     */
    @PatchMapping("/{id}/toggle-active")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<?> toggleAreaActive(@PathVariable Long id) {
        Area area = areaRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Area not found"));
        area.setActive(!Boolean.TRUE.equals(area.getActive()));
        areaRepository.save(area);
        return ResponseEntity.ok(area);
    }

    /**
     * DELETE /api/areas/{id}
     */
    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<?> deleteArea(@PathVariable Long id) {
        if (!areaRepository.existsById(id)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Area not found");
        }
        areaRepository.deleteById(id);
        return ResponseEntity.ok(Map.of("message", "Area deleted"));
    }
}
