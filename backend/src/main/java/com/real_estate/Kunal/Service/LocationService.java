package com.real_estate.Kunal.Service;

import com.real_estate.Kunal.DTO.CustomCityRequest;
import com.real_estate.Kunal.DTO.CustomCityResponse;
import com.real_estate.Kunal.DTO.LocationRequest;
import com.real_estate.Kunal.DTO.MapUrlResolveResponse;
import com.real_estate.Kunal.Entity.Area;
import com.real_estate.Kunal.Entity.CustomCity;
import com.real_estate.Kunal.Entity.Location;
import com.real_estate.Kunal.Repository.AreaRepository;
import com.real_estate.Kunal.Repository.CustomCityRepository;
import com.real_estate.Kunal.Repository.LocationRepository;

import lombok.RequiredArgsConstructor;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.net.URI;
import java.io.IOException;
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
    private final AreaRepository areaRepository;
    // Construct only when resolving a remote URL; ordinary DB operations need no sockets.
    protected HttpClient httpClient() {
        return HttpClient.newBuilder()
                .followRedirects(HttpClient.Redirect.NEVER)
                .connectTimeout(Duration.ofSeconds(10))
                .build();
    }

    private URI validateMapUri(String raw) {
        URI uri = URI.create(raw);
        String host = uri.getHost() == null ? "" : uri.getHost().toLowerCase(java.util.Locale.ROOT);
        if (!"https".equalsIgnoreCase(uri.getScheme()) || uri.getUserInfo() != null
                || (uri.getPort() != -1 && uri.getPort() != 443)
                || !java.util.Set.of("google.com", "www.google.com", "maps.google.com",
                        "google.co.in", "www.google.co.in", "maps.google.co.in",
                        "maps.app.goo.gl", "goo.gl").contains(host)) {
            throw new IllegalArgumentException("Use an HTTPS Google Maps URL");
        }
        if ("goo.gl".equals(host) && !uri.getPath().startsWith("/maps/")) {
            throw new IllegalArgumentException("Use a Google Maps short link");
        }
        return uri;
    }

    private HttpResponse<String> fetchMap(URI uri) throws IOException, InterruptedException {
        HttpClient client = httpClient();
        for (int redirects = 0; redirects <= 5; redirects++) {
            URI safeUri = validateMapUri(uri.toString());
            HttpRequest request = HttpRequest.newBuilder(safeUri)
                    .timeout(Duration.ofSeconds(15))
                    .header("Accept", "text/html")
                    .header("User-Agent", "Mozilla/5.0")
                    .GET().build();
            HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() < 300 || response.statusCode() >= 400) return response;
            String location = response.headers().firstValue("Location")
                    .orElseThrow(() -> new IllegalArgumentException("Map redirect has no destination"));
            uri = validateMapUri(safeUri.resolve(location).toString());
        }
        throw new IllegalArgumentException("Too many map redirects");
    }

    public Location createLocation(LocationRequest request) {
        String state = request.getState() != null ? request.getState().trim() : "";
        String city = request.getCity() != null ? request.getCity().trim() : "";
        String area = request.getArea() != null ? request.getArea().trim() : "";
        Double rate = request.getEffectivePricing();

        if (state.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "State is required");
        }
        if (city.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "City is required");
        }
        if (area.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Area is required");
        }
        if (rate == null || rate <= 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Location pricing is required and must be a valid positive number");
        }

        // Prevent duplicate identical State + City + Area locations
        if (locationRepository.existsByCityIgnoreCaseAndStateIgnoreCaseAndAreaIgnoreCase(city, state, area)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Location already exists for " + state + " -> " + city + " -> " + area);
        }

        String locationName = (request.getLocationName() != null && !request.getLocationName().isBlank())
                ? request.getLocationName().trim()
                : (state + " - " + city + " - " + area);

        Location location = Location.builder()
                .locationName(locationName)
                .city(city)
                .state(state)
                .area(area)
                .subscriptionRate(rate)
                .createdAt(LocalDateTime.now())
                .build();

        Location savedLocation = locationRepository.save(location);

        // Keep CustomCity & Area entities in sync for system-wide consistency
        try {
            if (!customCityRepository.existsByStateIgnoreCaseAndCityIgnoreCase(state, city)) {
                customCityRepository.save(CustomCity.builder()
                        .state(state)
                        .city(city)
                        .subscriptionRate(rate)
                        .active(true)
                        .addedBy(currentUserId())
                        .build());
            }
            if (!areaRepository.existsByNameIgnoreCaseAndCityIgnoreCaseAndStateIgnoreCase(area, city, state)) {
                areaRepository.save(Area.builder()
                        .name(area)
                        .city(city)
                        .state(state)
                        .subscriptionRate(rate)
                        .active(true)
                        .build());
            } else {
                areaRepository.findByNameIgnoreCaseAndCityIgnoreCaseAndStateIgnoreCase(area, city, state)
                        .ifPresent(existingArea -> {
                            if (existingArea.getSubscriptionRate() == null || existingArea.getSubscriptionRate() <= 0) {
                                existingArea.setSubscriptionRate(rate);
                                areaRepository.save(existingArea);
                            }
                        });
            }
        } catch (Exception ignored) {
            // Non-critical auxiliary sync
        }

        return savedLocation;
    }

    public List<Location> getAllLocations() {
        return locationRepository.findAllByOrderByStateAscCityAscAreaAsc();
    }

    public Location getLocationById(Long id) {
        return locationRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Location not found"));
    }

    public Location updateLocation(Long id, LocationRequest request) {
        Location location = locationRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Location not found"));

        String state = request.getState() != null ? request.getState().trim() : "";
        String city = request.getCity() != null ? request.getCity().trim() : "";
        String area = request.getArea() != null ? request.getArea().trim() : "";
        Double rate = request.getEffectivePricing();

        if (state.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "State is required");
        }
        if (city.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "City is required");
        }
        if (area.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Area is required");
        }
        if (rate == null || rate <= 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Location pricing is required and must be a valid positive number");
        }

        // Prevent duplicate identical State + City + Area on another record
        locationRepository.findByCityIgnoreCaseAndStateIgnoreCaseAndAreaIgnoreCase(city, state, area)
                .ifPresent(existing -> {
                    if (!existing.getId().equals(id)) {
                        throw new ResponseStatusException(HttpStatus.CONFLICT, "Another location already exists for " + state + " -> " + city + " -> " + area);
                    }
                });

        String locationName = (request.getLocationName() != null && !request.getLocationName().isBlank())
                ? request.getLocationName().trim()
                : (state + " - " + city + " - " + area);

        location.setLocationName(locationName);
        location.setCity(city);
        location.setState(state);
        location.setArea(area);
        location.setSubscriptionRate(rate);

        Location updated = locationRepository.save(location);

        // Keep Area subscription rate in sync
        try {
            areaRepository.findByNameIgnoreCaseAndCityIgnoreCaseAndStateIgnoreCase(area, city, state)
                    .ifPresent(existingArea -> {
                        existingArea.setSubscriptionRate(rate);
                        areaRepository.save(existingArea);
                    });
        } catch (Exception ignored) {}

        return updated;
    }

    public void deleteLocation(Long id) {
        Location location = locationRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Location not found"));

        locationRepository.delete(location);
    }

    public MapUrlResolveResponse resolveMapUrl(String url) {
        if (url == null || url.isBlank()) {
            throw new IllegalArgumentException("URL is required");
        }

        URI inputUri = validateMapUri(url);
        LatLng direct = extractLatLng(url);
        if (direct != null) {
            return MapUrlResolveResponse.builder()
                    .latitude(direct.lat())
                    .longitude(direct.lng())
                    .resolvedUrl(url)
                    .build();
        }

        try {
            HttpResponse<String> response = fetchMap(inputUri);

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
            HttpResponse<String> response = httpClient().send(request, HttpResponse.BodyHandlers.ofString());
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

    public java.util.List<CustomCityResponse> getCustomCities(String state) {
        java.util.List<CustomCity> cities = (state != null && !state.isBlank())
                ? customCityRepository.findByStateIgnoreCase(state)
                : customCityRepository.findAllByOrderByStateAscCityAsc();
        return cities.stream()
                .map(this::toCustomCityResponse)
                .toList();
    }

    public CustomCityResponse addCustomCity(CustomCityRequest request) {
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

        CustomCity saved = customCityRepository.save(
                CustomCity.builder()
                        .state(state)
                        .city(city)
                        .subscriptionRate(request.getSubscriptionRate())
                        .active(true)
                        .addedBy(currentUserId())
                        .build());
        return toCustomCityResponse(saved);
    }

    public CustomCityResponse toggleCustomCityActive(Long id) {
        CustomCity city = customCityRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "City not found"));
        city.setActive(!Boolean.TRUE.equals(city.getActive()));
        CustomCity saved = customCityRepository.save(city);
        return toCustomCityResponse(saved);
    }

    private CustomCityResponse toCustomCityResponse(CustomCity c) {
        return CustomCityResponse.builder()
                .id(c.getId())
                .state(c.getState())
                .city(c.getCity())
                .subscriptionRate(c.getSubscriptionRate())
                .active(c.getActive())
                .addedBy(c.getAddedBy())
                .addedAt(c.getAddedAt())
                .build();
    }

    private Long currentUserId() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || "anonymousUser".equals(auth.getPrincipal())) return null;
        try { return Long.parseLong(auth.getName()); } catch (NumberFormatException ignored) { return null; }
    }

    /**
     * Returns the subscription rate for a given city+state, optionally with area.
     * Resolves against CustomCity/Area instead of the legacy Location table.
     * Area's value overrides CustomCity's if set.
     */
    public java.util.Optional<Double> getLocationRate(String city, String state, String area) {
        if (city == null || city.isBlank()) {
            return java.util.Optional.empty();
        }
        String trimmedCity = city.trim();
        String trimmedState = (state != null && !state.isBlank()) ? state.trim() : null;
        String trimmedArea = (area != null && !area.isBlank()) ? area.trim() : null;

        // 1. Try Area first (Area's value overrides CustomCity's if set)
        if (trimmedArea != null) {
            java.util.Optional<Area> areaMatch = (trimmedState != null)
                    ? areaRepository.findByNameIgnoreCaseAndCityIgnoreCaseAndStateIgnoreCase(trimmedArea, trimmedCity, trimmedState)
                    : areaRepository.findFirstByNameIgnoreCaseAndCityIgnoreCase(trimmedArea, trimmedCity);

            if (areaMatch.isPresent() && areaMatch.get().getSubscriptionRate() != null) {
                return java.util.Optional.of(areaMatch.get().getSubscriptionRate());
            }
        }

        // 2. Fall back to CustomCity
        java.util.Optional<CustomCity> cityMatch = (trimmedState != null)
                ? customCityRepository.findByStateIgnoreCaseAndCityIgnoreCase(trimmedState, trimmedCity)
                : customCityRepository.findFirstByCityIgnoreCase(trimmedCity);

        if (cityMatch.isPresent() && cityMatch.get().getSubscriptionRate() != null) {
            return java.util.Optional.of(cityMatch.get().getSubscriptionRate());
        }

        return java.util.Optional.empty();
    }

    /**
     * Returns the city name to use for scope enforcement for the given user.
     * <p>
     * Prefers the FK-backed {@code customCityId}; falls back to the deprecated
     * {@code assignedCity} string so that users created before the FK migration
     * continue to work without a forced re-migration.
     *
     * @param user the user whose city scope to resolve
     * @return city name, or {@code null} if no city scope is set
     */
    public String resolveUserCityName(com.real_estate.Kunal.Entity.User user) {
        if (user == null) return null;
        if (user.getCustomCityId() != null) {
            return customCityRepository.findById(user.getCustomCityId())
                    .map(CustomCity::getCity)
                    .orElse(null);
        }
        // Legacy fallback – deprecated field kept for one release
        @SuppressWarnings("deprecation")
        String legacy = user.getAssignedCity();
        return (legacy != null && !legacy.isBlank()) ? legacy.trim() : null;
    }

    /**
     * Returns the area name to use for scope enforcement for the given user.
     * <p>
     * Prefers the FK-backed {@code areaId}; falls back to the deprecated
     * {@code assignedArea} string.
     *
     * @param user the user whose area scope to resolve
     * @return area name, or {@code null} if no area scope is set
     */
    public String resolveUserAreaName(com.real_estate.Kunal.Entity.User user) {
        if (user == null) return null;
        if (user.getAreaId() != null) {
            return areaRepository.findById(user.getAreaId())
                    .map(Area::getName)
                    .orElse(null);
        }
        // Legacy fallback – deprecated field kept for one release
        @SuppressWarnings("deprecation")
        String legacy = user.getAssignedArea();
        return (legacy != null && !legacy.isBlank()) ? legacy.trim() : null;
    }

    /**
     * Resolves an {@link Area} id from name+city+state name strings.
     * Convenience wrapper around {@link AreaRepository} lookups for callers
     * that don't have {@link AreaRepository} directly injected.
     *
     * @param areaName area name (may be null)
     * @param cityName city name (may be null)
     * @param stateName state name (may be null)
     * @return Area id, or {@code null} if not found or input is blank
     */
    public Long resolveAreaIdByName(String areaName, String cityName, String stateName) {
        if (areaName == null || areaName.isBlank() || cityName == null || cityName.isBlank()) return null;
        if (stateName != null && !stateName.isBlank()) {
            return areaRepository
                    .findByNameIgnoreCaseAndCityIgnoreCaseAndStateIgnoreCase(
                            areaName.trim(), cityName.trim(), stateName.trim())
                    .map(Area::getId)
                    .orElseGet(() -> areaRepository
                            .findFirstByNameIgnoreCaseAndCityIgnoreCase(areaName.trim(), cityName.trim())
                            .map(Area::getId)
                            .orElse(null));
        }
        return areaRepository.findFirstByNameIgnoreCaseAndCityIgnoreCase(areaName.trim(), cityName.trim())
                .map(Area::getId)
                .orElse(null);
    }

}
