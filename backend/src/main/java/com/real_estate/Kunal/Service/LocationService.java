package com.real_estate.Kunal.Service;

import com.real_estate.Kunal.DTO.LocationRequest;
import com.real_estate.Kunal.DTO.MapUrlResolveResponse;
import com.real_estate.Kunal.Entity.Location;
import com.real_estate.Kunal.Repository.CustomCityRepository;
import com.real_estate.Kunal.Repository.LocationRepository;

import lombok.RequiredArgsConstructor;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.net.URI;
import java.net.URLDecoder;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
@RequiredArgsConstructor
public class LocationService {

    private final LocationRepository locationRepository;
    private final CustomCityRepository customCityRepository;
    private final HttpClient httpClient = HttpClient.newBuilder()
            .followRedirects(HttpClient.Redirect.NORMAL)
            .connectTimeout(Duration.ofSeconds(10))
            .build();

    public Location createLocation(LocationRequest request) {

        Location location = Location.builder()
                .locationName(request.getLocationName().trim())
                .city(request.getCity().trim())
                .state(request.getState().trim())
                .area(normalizeOptionalText(request.getArea()))
                .subscriptionRate(request.getSubscriptionRate())
                .createdAt(LocalDateTime.now())
                .build();

        return locationRepository.save(location);
    }

    public List<Location> getAllLocations() {
        return locationRepository.findAll();
    }

    public Location getLocationById(Long id) {
        return locationRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Location not found"));
    }

    public Location updateLocation(Long id, LocationRequest request) {

        Location location = locationRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Location not found"));

        location.setLocationName(request.getLocationName().trim());
        location.setCity(request.getCity().trim());
        location.setState(request.getState().trim());
        location.setArea(normalizeOptionalText(request.getArea()));
        location.setSubscriptionRate(request.getSubscriptionRate());

        return locationRepository.save(location);
    }

    public void deleteLocation(Long id) {

        Location location = locationRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Location not found"));

        locationRepository.delete(location);
    }

    public MapUrlResolveResponse resolveMapUrl(String url) {
        if (url == null || url.isBlank()) {
            throw new IllegalArgumentException("URL is required");
        }

        LatLng direct = extractLatLng(url);
        if (direct != null) {
            return MapUrlResolveResponse.builder()
                    .latitude(direct.lat())
                    .longitude(direct.lng())
                    .resolvedUrl(url)
                    .build();
        }

        try {
            URI inputUri = URI.create(url);
            HttpRequest request = HttpRequest.newBuilder(inputUri)
                    .timeout(Duration.ofSeconds(15))
                    .header("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8")
                    .header("User-Agent", "Mozilla/5.0")
                    .GET()
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

            String finalUrl = response.uri() != null ? response.uri().toString() : url;
            LatLng fromFinal = extractLatLng(finalUrl);
            if (fromFinal != null) {
                return MapUrlResolveResponse.builder()
                        .latitude(fromFinal.lat())
                        .longitude(fromFinal.lng())
                        .resolvedUrl(finalUrl)
                        .build();
            }

            LatLng fromBody = extractLatLng(response.body());
            if (fromBody != null) {
                return MapUrlResolveResponse.builder()
                        .latitude(fromBody.lat())
                        .longitude(fromBody.lng())
                        .resolvedUrl(finalUrl)
                        .build();
            }

            String placeQuery = extractPlaceQuery(finalUrl);
            if (placeQuery != null) {
                LatLng fromGeocode = geocodePlaceQuery(placeQuery);
                if (fromGeocode != null) {
                    return MapUrlResolveResponse.builder()
                            .latitude(fromGeocode.lat())
                            .longitude(fromGeocode.lng())
                            .resolvedUrl(finalUrl)
                            .build();
                }
            }
        } catch (Exception ignored) {
            // Return a clear, user-facing parse failure below.
        }

        throw new IllegalArgumentException("Could not resolve coordinates from the provided map URL");
    }

    private LatLng extractLatLng(String text) {
        if (text == null || text.isBlank()) {
            return null;
        }

        String normalized = text;
        try {
            normalized = URLDecoder.decode(text, StandardCharsets.UTF_8);
        } catch (Exception ignored) {
            // Keep original text if decode fails.
        }

        // Priority 1: Exact place coordinates in Google Maps payload.
        // Example: !8m2!3d18.1769217!4d74.5990787
        LatLng from3d4d = extractLastMatch(
                normalized,
                Pattern.compile("!3d(-?\\d+(?:\\.\\d+)?)!4d(-?\\d+(?:\\.\\d+)?)")
        );
        if (from3d4d != null) {
            return from3d4d;
        }

        // Priority 2: Query parameters.
        LatLng fromQuery = extractFirstMatch(
                normalized,
                Pattern.compile("[?&](?:q|query|ll|center|daddr|saddr|destination|origin)=(-?\\d+(?:\\.\\d+)?),(-?\\d+(?:\\.\\d+)?)")
        );
        if (fromQuery != null) {
            return fromQuery;
        }

        // Priority 3: Map viewport center coordinates in URL path.
        LatLng fromAt = extractFirstMatch(
                normalized,
                Pattern.compile("@(-?\\d+(?:\\.\\d+)?),(-?\\d+(?:\\.\\d+)?)")
        );
        if (fromAt != null) {
            return fromAt;
        }

        // Priority 4: Embedded JSON snippets.
        LatLng fromJson = extractFirstMatch(
                normalized,
                Pattern.compile("\\\"lat\\\"\\s*:\\s*(-?\\d+(?:\\.\\d+)?)\\s*,\\s*\\\"lng\\\"\\s*:\\s*(-?\\d+(?:\\.\\d+)?)")
        );
        if (fromJson != null) {
            return fromJson;
        }

        return null;
    }

    private String extractPlaceQuery(String url) {
        if (url == null || url.isBlank()) {
            return null;
        }
        try {
            URI uri = URI.create(url);
            String query = uri.getRawQuery();
            if (query == null || query.isBlank()) {
                return null;
            }
            for (String part : query.split("&")) {
                int equals = part.indexOf('=');
                if (equals <= 0) {
                    continue;
                }
                String key = URLDecoder.decode(part.substring(0, equals), StandardCharsets.UTF_8);
                if (!"q".equals(key) && !"query".equals(key)) {
                    continue;
                }
                String value = URLDecoder.decode(part.substring(equals + 1), StandardCharsets.UTF_8).trim();
                if (value.isBlank() || extractLatLng(value) != null) {
                    return null;
                }
                return value;
            }
        } catch (Exception ignored) {
            return null;
        }
        return null;
    }

    private LatLng geocodePlaceQuery(String placeQuery) {
        try {
            String encoded = URLEncoder.encode(placeQuery, StandardCharsets.UTF_8);
            URI uri = URI.create("https://nominatim.openstreetmap.org/search?format=json&limit=1&q=" + encoded);
            HttpRequest request = HttpRequest.newBuilder(uri)
                    .timeout(Duration.ofSeconds(12))
                    .header("Accept", "application/json")
                    .header("User-Agent", "reactestate-map-resolver/1.0")
                    .GET()
                    .build();
            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                return null;
            }
            return extractFirstMatch(
                    response.body(),
                    Pattern.compile("\\\"lat\\\"\\s*:\\s*\\\"(-?\\d+(?:\\.\\d+)?)\\\".*?\\\"lon\\\"\\s*:\\s*\\\"(-?\\d+(?:\\.\\d+)?)\\\"", Pattern.DOTALL)
            );
        } catch (Exception ignored) {
            return null;
        }
    }

    private LatLng extractFirstMatch(String text, Pattern pattern) {
        Matcher matcher = pattern.matcher(text);
        while (matcher.find()) {
            LatLng parsed = parseLatLng(matcher.group(1), matcher.group(2));
            if (parsed != null) {
                return parsed;
            }
        }
        return null;
    }

    private LatLng extractLastMatch(String text, Pattern pattern) {
        Matcher matcher = pattern.matcher(text);
        LatLng best = null;
        while (matcher.find()) {
            LatLng parsed = parseLatLng(matcher.group(1), matcher.group(2));
            if (parsed != null) {
                best = parsed;
            }
        }
        return best;
    }

    private LatLng parseLatLng(String latRaw, String lngRaw) {
        try {
            double lat = Double.parseDouble(latRaw);
            double lng = Double.parseDouble(lngRaw);
            if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
                return new LatLng(lat, lng);
            }
        } catch (NumberFormatException ignored) {
            // Invalid coordinates.
        }
        return null;
    }

    private record LatLng(double lat, double lng) {}

    private String normalizeOptionalText(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim();
    }

    // ── Custom City methods ───────────────────────────────────────────────

    public java.util.List<com.real_estate.Kunal.DTO.CustomCityResponse> getCustomCities(String state) {
        java.util.List<com.real_estate.Kunal.Entity.CustomCity> cities = (state != null && !state.isBlank())
                ? customCityRepository.findByStateIgnoreCase(state)
                : customCityRepository.findAllByOrderByStateAscCityAsc();
        return cities.stream()
                .map(c -> com.real_estate.Kunal.DTO.CustomCityResponse.builder()
                        .id(c.getId()).state(c.getState()).city(c.getCity())
                        .addedBy(c.getAddedBy()).addedAt(c.getAddedAt())
                        .build())
                .toList();
    }

    public com.real_estate.Kunal.DTO.CustomCityResponse addCustomCity(com.real_estate.Kunal.DTO.CustomCityRequest request) {
        String state = request.getState() != null ? request.getState().trim() : "";
        String city  = request.getCity()  != null ? request.getCity().trim()  : "";
        if (state.isBlank() || city.isBlank())
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "State and city are required");
        if (city.length() < 2)
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "City name must have at least 2 characters");
        if (!city.matches("[A-Za-z\\s\\-\\.]+"))
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "City name must not contain special characters");
        if (customCityRepository.existsByStateIgnoreCaseAndCityIgnoreCase(state, city))
            throw new ResponseStatusException(HttpStatus.CONFLICT, "City already exists for this state");

        com.real_estate.Kunal.Entity.CustomCity saved = customCityRepository.save(
                com.real_estate.Kunal.Entity.CustomCity.builder().state(state).city(city).addedBy(currentUserId()).build());
        return com.real_estate.Kunal.DTO.CustomCityResponse.builder()
                .id(saved.getId()).state(saved.getState()).city(saved.getCity())
                .addedBy(saved.getAddedBy()).addedAt(saved.getAddedAt())
                .build();
    }

    private Long currentUserId() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || "anonymousUser".equals(auth.getPrincipal())) return null;
        try { return Long.parseLong(auth.getName()); } catch (NumberFormatException ignored) { return null; }
    }

    /**
     * Returns the subscription rate for a given city+state, optionally with area.
     * If area is provided, tries area-specific rate first, then falls back to city-level.
     */
    public java.util.Optional<Double> getLocationRate(String city, String state, String area) {
        // Try area-specific rate first
        if (area != null && !area.isBlank()) {
            java.util.Optional<Location> areaRate = locationRepository.findByCityIgnoreCaseAndStateIgnoreCaseAndAreaIgnoreCase(city, state, area);
            if (areaRate.isPresent() && areaRate.get().getSubscriptionRate() != null) {
                return java.util.Optional.of(areaRate.get().getSubscriptionRate());
            }
        }

        // Fall back to city+state rate
        return locationRepository.findByCityIgnoreCaseAndStateIgnoreCaseAndAreaIsNull(city, state)
                .map(Location::getSubscriptionRate);
    }

}
