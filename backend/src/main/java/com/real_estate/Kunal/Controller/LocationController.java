package com.real_estate.Kunal.Controller;

import com.real_estate.Kunal.DTO.CustomCityRequest;
import com.real_estate.Kunal.DTO.CustomCityResponse;
import com.real_estate.Kunal.DTO.LocationRequest;
import com.real_estate.Kunal.DTO.MapUrlResolveResponse;
import com.real_estate.Kunal.Entity.Location;
import com.real_estate.Kunal.Service.LocationService;
import jakarta.validation.Valid;

import lombok.RequiredArgsConstructor;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/locations")
@RequiredArgsConstructor
public class LocationController {

    private final LocationService locationService;

    @GetMapping
    public List<Location> getAllLocations() {
        return locationService.getAllLocations();
    }

    @GetMapping("/{id}")
    public Location getLocationById(@PathVariable("id") Long id) {
        return locationService.getLocationById(id);
    }

    @PostMapping
    public Location createLocation(@Valid @RequestBody LocationRequest request) {
        return locationService.createLocation(request);
    }

    @PutMapping("/{id}")
    public Location updateLocation(@PathVariable("id") Long id,
                                   @Valid @RequestBody LocationRequest request) {
        return locationService.updateLocation(id, request);
    }

    @DeleteMapping("/{id}")
    public void deleteLocation(@PathVariable("id") Long id) {
        locationService.deleteLocation(id);
    }

    @GetMapping("/resolve-map-url")
    public ResponseEntity<?> resolveMapUrl(@RequestParam("url") String url) {
        try {
            MapUrlResolveResponse response = locationService.resolveMapUrl(url);
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(java.util.Map.of("message", ex.getMessage()));
        }
    }

    /** GET /api/locations/cities?state=Maharashtra — returns custom cities for a state */
    @GetMapping("/cities")
    public List<CustomCityResponse> getCustomCities(
            @RequestParam(value = "state", required = false) String state) {
        return locationService.getCustomCities(state);
    }

    /** POST /api/locations/cities — SuperAdmin adds a new city */
    @PostMapping("/cities")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public CustomCityResponse addCustomCity(@Valid @RequestBody CustomCityRequest request) {
        return locationService.addCustomCity(request);
    }

    /** GET /api/locations/rate?city=X&state=Y&area=Z — returns subscription rate for a city/area */
    @GetMapping("/rate")
    public ResponseEntity<?> getLocationRate(
            @RequestParam("city") String city,
            @RequestParam("state") String state,
            @RequestParam(value = "area", required = false) String area) {
        return locationService.getLocationRate(city, state, area)
                .map(rate -> ResponseEntity.ok(java.util.Map.of(
                        "city", city,
                        "state", state,
                        "area", area != null ? area : "",
                        "subscriptionRate", rate)))
                .orElse(ResponseEntity.notFound().build());
    }

}
