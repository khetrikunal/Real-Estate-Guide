package com.real_estate.Kunal.Service;

import com.real_estate.Kunal.DTO.MonthlySales;
import com.real_estate.Kunal.DTO.SaleRecordRequest;
import com.real_estate.Kunal.DTO.SaleRecordResponse;
import com.real_estate.Kunal.DTO.SalesAnalyticsResponse;
import com.real_estate.Kunal.DTO.SalesPerformancePointResponse;
import com.real_estate.Kunal.DTO.SalesPerformanceResponse;
import com.real_estate.Kunal.DTO.SalesPerformanceSeriesResponse;
import com.real_estate.Kunal.Entity.Project;
import com.real_estate.Kunal.Entity.Role;
import com.real_estate.Kunal.Entity.Sale;
import com.real_estate.Kunal.Entity.User;
import com.real_estate.Kunal.Repository.ProjectRepository;
import com.real_estate.Kunal.Repository.SaleRepository;
import com.real_estate.Kunal.Repository.UserRepository;

import lombok.RequiredArgsConstructor;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class SalesService {

    private final SaleRepository saleRepository;
    private final UserRepository userRepository;
    private final ProjectRepository projectRepository;

    // ── Legacy / existing methods ──────────────────────────────────────────

    public Sale recordSale(SaleRecordRequest request) {
        if (request.getBuyerName() == null || request.getBuyerName().isBlank()) {
            throw new IllegalArgumentException("buyerName is required");
        }
        if (request.getBuyerPhone() == null || request.getBuyerPhone().isBlank()) {
            throw new IllegalArgumentException("buyerPhone is required");
        }

        User current = getCurrentUser();
        Project project = request.getProjectId() != null
                ? projectRepository.findById(request.getProjectId()).orElse(null)
                : null;
        assertSaleProjectAccess(current, project);
        Sale sale = Sale.builder()
                .projectId(request.getProjectId())
                .projectName(project != null ? project.getProjectName() : null)
                .soldByUserId(current != null ? current.getId() : null)
                .soldByName(current != null ? current.getName() : null)
                .soldByRole(current != null && current.getRole() != null ? current.getRole().name() : null)
                .employeeId(current != null ? current.getId().toString() : null)
                .unitId(request.getUnitId())
                .unitsSold(1)
                .amount(request.getAmount())
                .buyerName(request.getBuyerName())
                .buyerPhone(request.getBuyerPhone())
                .buyerEmail(request.getBuyerEmail())
                .notes(request.getNotes())
                .saleDate(LocalDateTime.now())
                .build();
        return saleRepository.save(sale);
    }

    public SalesAnalyticsResponse getAnalytics() {
        User current = getCurrentUser();
        if (current == null) {
            return SalesAnalyticsResponse.builder()
                    .totalSales(0.0)
                    .totalTransactions(0L)
                    .monthlySales(List.of())
                    .build();
        }

        List<Sale> scopedSales = scopeSalesForUser(current);
        Map<Integer, Double> monthlyTotals = new LinkedHashMap<>();
        for (int month = 1; month <= 12; month++) {
            monthlyTotals.put(month, 0.0);
        }
        for (Sale sale : scopedSales) {
            if (sale.getSaleDate() == null) {
                continue;
            }
            int month = sale.getSaleDate().getMonthValue();
            monthlyTotals.put(month, monthlyTotals.get(month) + safeAmount(sale.getAmount()));
        }

        List<MonthlySales> monthlySales = monthlyTotals.entrySet().stream()
                .map(entry -> new MonthlySales(entry.getKey(), entry.getValue()))
                .collect(Collectors.toList());

        double totalSales = scopedSales.stream().mapToDouble(s -> safeAmount(s.getAmount())).sum();
        long totalTransactions = scopedSales.size();
        return SalesAnalyticsResponse.builder()
                .totalSales(totalSales)
                .totalTransactions(totalTransactions)
                .monthlySales(monthlySales)
                .build();
    }

    // ── New API methods ────────────────────────────────────────────────────

    /**
     * Returns sale records. Admins/SuperAdmins see all; others see only their own.
     */
    public List<SaleRecordResponse> getSales(String ignoredRoleParam) {
        User current = getCurrentUser();
        if (current == null) {
            return List.of();
        }
        List<Sale> sales = scopeSalesForUser(current);
        return sales.stream()
                .sorted(Comparator.comparing(Sale::getSaleDate, Comparator.nullsLast(Comparator.reverseOrder())))
                .map(this::toSaleRecordResponse)
                .collect(Collectors.toList());
    }

    /**
     * Returns daily performance aggregated as chart series.
     * range: "7d" → 7 daily points, "30d" → 5 weekly points.
     * groupBy: "seller" → one series per seller.
     */
    public SalesPerformanceResponse getPerformance(Long userId, String range, String groupBy) {
        boolean monthly = "30d".equalsIgnoreCase(range);
        int days = monthly ? 30 : 7;
        LocalDateTime since = LocalDateTime.now().minusDays(days).withHour(0).withMinute(0).withSecond(0).withNano(0);

        User current = getCurrentUser();
        if (current == null) {
            return SalesPerformanceResponse.builder()
                .range(range != null ? range : "7d")
                .groupBy(groupBy)
                .series(List.of())
                .build();
        }

        List<Sale> allSales = scopeSalesForUser(current).stream()
                .filter(s -> s.getSaleDate() != null && !s.getSaleDate().isBefore(since))
                .collect(Collectors.toList());

        // Optional additional narrowing only for elevated roles.
        if (userId != null && (current.getRole() == Role.SUPER_ADMIN || current.getRole() == Role.ADMIN)) {
            allSales = allSales.stream()
                    .filter(s -> userId.equals(s.getSoldByUserId()))
                    .collect(Collectors.toList());
        }

        List<SalesPerformanceSeriesResponse> series;
        if ("seller".equalsIgnoreCase(groupBy)) {
            series = buildSellerSeries(allSales, since, days, monthly);
        } else {
            series = List.of(buildTotalSeries(allSales, since, days, monthly));
        }

        return SalesPerformanceResponse.builder()
                .range(range != null ? range : "7d")
                .groupBy(groupBy)
                .series(series)
                .build();
    }

    // ── Private helpers ────────────────────────────────────────────────────

    private SalesPerformanceSeriesResponse buildTotalSeries(
            List<Sale> sales, LocalDateTime since, int days, boolean monthly) {
        List<SalesPerformancePointResponse> points = buildPoints(sales, since, days, monthly);
        return SalesPerformanceSeriesResponse.builder()
                .name("Total")
                .role(null)
                .points(points)
                .build();
    }

    private List<SalesPerformanceSeriesResponse> buildSellerSeries(
            List<Sale> sales, LocalDateTime since, int days, boolean monthly) {

        // Group by seller
        Map<Long, List<Sale>> bySeller = sales.stream()
                .filter(s -> s.getSoldByUserId() != null)
                .collect(Collectors.groupingBy(Sale::getSoldByUserId));

        // Sort sellers by total units desc, keep top 5
        List<Map.Entry<Long, List<Sale>>> sorted = bySeller.entrySet().stream()
                .sorted((a, b) -> totalUnits(b.getValue()) - totalUnits(a.getValue()))
                .collect(Collectors.toList());

        List<Map.Entry<Long, List<Sale>>> top = sorted.stream().limit(5).collect(Collectors.toList());
        List<Sale> othersSales = sorted.stream().skip(5)
                .flatMap(e -> e.getValue().stream())
                .collect(Collectors.toList());

        List<SalesPerformanceSeriesResponse> result = new ArrayList<>();
        for (Map.Entry<Long, List<Sale>> entry : top) {
            Sale sample = entry.getValue().get(0);
            String name = sample.getSoldByName() != null ? sample.getSoldByName() : "User " + entry.getKey();
            String role = sample.getSoldByRole();
            result.add(SalesPerformanceSeriesResponse.builder()
                    .name(name)
                    .role(role)
                    .points(buildPoints(entry.getValue(), since, days, monthly))
                    .build());
        }
        if (!othersSales.isEmpty()) {
            result.add(SalesPerformanceSeriesResponse.builder()
                    .name("Others")
                    .role(null)
                    .points(buildPoints(othersSales, since, days, monthly))
                    .build());
        }
        return result;
    }

    private List<SalesPerformancePointResponse> buildPoints(
            List<Sale> sales, LocalDateTime since, int days, boolean monthly) {
        if (monthly) {
            return buildWeeklyPoints(sales, since);
        } else {
            return buildDailyPoints(sales, since, days);
        }
    }

    private List<SalesPerformancePointResponse> buildDailyPoints(
            List<Sale> sales, LocalDateTime since, int days) {
        DateTimeFormatter fmt = DateTimeFormatter.ofPattern("MMM d");
        // Build ordered map: date → unitsSold
        Map<LocalDate, Integer> map = new LinkedHashMap<>();
        for (int i = 0; i < days; i++) {
            map.put(since.toLocalDate().plusDays(i), 0);
        }
        for (Sale s : sales) {
            LocalDate d = s.getSaleDate().toLocalDate();
            map.computeIfPresent(d, (k, v) -> v + (s.getUnitsSold() != null ? s.getUnitsSold() : 0));
        }
        List<SalesPerformancePointResponse> points = new ArrayList<>();
        int idx = 0;
        for (Map.Entry<LocalDate, Integer> e : map.entrySet()) {
            points.add(SalesPerformancePointResponse.builder()
                    .index(idx++)
                    .label(e.getKey().format(fmt))
                    .unitsSold(e.getValue())
                    .build());
        }
        return points;
    }

    private List<SalesPerformancePointResponse> buildWeeklyPoints(
            List<Sale> sales, LocalDateTime since) {
        // 5 weekly buckets
        List<SalesPerformancePointResponse> points = new ArrayList<>();
        DateTimeFormatter fmt = DateTimeFormatter.ofPattern("MMM d");
        for (int week = 0; week < 5; week++) {
            LocalDateTime weekStart = since.plusDays((long) week * 7);
            LocalDateTime weekEnd = weekStart.plusDays(7);
            int units = sales.stream()
                    .filter(s -> !s.getSaleDate().isBefore(weekStart) && s.getSaleDate().isBefore(weekEnd))
                    .mapToInt(s -> s.getUnitsSold() != null ? s.getUnitsSold() : 0)
                    .sum();
            String label = "Wk " + (week + 1) + " (" + weekStart.toLocalDate().format(fmt) + ")";
            points.add(SalesPerformancePointResponse.builder()
                    .index(week)
                    .label(label)
                    .unitsSold(units)
                    .build());
        }
        return points;
    }

    private int totalUnits(List<Sale> sales) {
        return sales.stream().mapToInt(s -> s.getUnitsSold() != null ? s.getUnitsSold() : 0).sum();
    }

    private SaleRecordResponse toSaleRecordResponse(Sale sale) {
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
                .soldByName(sale.getSoldByName())
                .soldByRole(sale.getSoldByRole())
                .unitsSold(sale.getUnitsSold())
                .amount(sale.getAmount())
                .saleDate(sale.getSaleDate())
                .buyerName(sale.getBuyerName())
                .buyerPhone(sale.getBuyerPhone())
                .buyerEmail(sale.getBuyerEmail())
                .notes(sale.getNotes())
                .build();
    }

    private User getCurrentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.isAuthenticated() && !auth.getPrincipal().equals("anonymousUser")) {
            return userRepository.findByEmail(auth.getName()).orElse(null);
        }
        return null;
    }

    private List<Sale> scopeSalesForUser(User current) {
        if (current.getRole() == Role.SUPER_ADMIN || current.getRole() == Role.ADMIN) {
            return saleRepository.findAll();
        }

        if (current.getRole() == Role.EMPLOYEE || current.getRole() == Role.SUB_ADMIN) {
            return saleRepository.findBySoldByUserId(current.getId());
        }

        return List.of();
    }

    private void assertSaleProjectAccess(User user, Project project) {
        if (user == null || project == null) {
            return;
        }
        if ((user.getRole() == Role.SUB_ADMIN || user.getRole() == Role.EMPLOYEE)
                && !java.util.Objects.equals(project.getUploadedBy(), user.getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "You can only sell properties you created");
        }
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
        if (value == null || value.isBlank()) {
            return false;
        }
        return scopes.stream().anyMatch(scope -> scope.equalsIgnoreCase(value.trim()));
    }


    private double safeAmount(Double amount) {
        return amount != null ? amount : 0.0;
    }
}
