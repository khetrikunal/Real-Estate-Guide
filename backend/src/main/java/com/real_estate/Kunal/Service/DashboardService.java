package com.real_estate.Kunal.Service;

import com.real_estate.Kunal.DTO.ActivityResponse;
import com.real_estate.Kunal.DTO.DashboardStatsResponse;
import com.real_estate.Kunal.Entity.Activity;
import com.real_estate.Kunal.Entity.Role;
import com.real_estate.Kunal.Entity.User;
import com.real_estate.Kunal.Entity.Project;
import com.real_estate.Kunal.Repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class DashboardService {

    private final ProjectRepository projectRepository;
    private final UserRepository userRepository;
    private final EmployeeRepository employeeRepository;
    private final LeadRepository leadRepository;
    private final ActivityRepository activityRepository;
    private final SaleRepository saleRepository;

    private User getCurrentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.isAuthenticated() && !auth.getPrincipal().equals("anonymousUser")) {
            return userRepository.findByEmail(auth.getName()).orElse(null);
        }
        return null;
    }

    public DashboardStatsResponse getDashboardStats() {
        User user = getCurrentUser();
        if (user == null) return DashboardStatsResponse.builder().build();

        long totalProjects;
        long totalAdmins = 0;
        long totalSubAdmins = 0;
        long totalEmployees;
        long totalLeads;
        long totalSales;
        double revenue = 0.0;

        if (user.getRole() == Role.SUPER_ADMIN) {
            totalProjects = projectRepository.countByIsDeletedFalse();
            totalAdmins = userRepository.countByRole(Role.ADMIN);
            totalSubAdmins = userRepository.countByRole(Role.SUB_ADMIN);
            totalEmployees = employeeRepository.count();
            totalLeads = leadRepository.count();
            totalSales = saleRepository.count();
            revenue = saleRepository.sumAllAmounts();
        } else if (user.getRole() == Role.ADMIN) {
            // Admin sees their employees and projects they/employees uploaded
            totalProjects = projectRepository.countByUploadedByAndIsDeletedFalse(user.getId()); // Projects uploaded by Admin
            totalEmployees = userRepository.countByAddedBy(user.getId());
            
            List<Long> teamUserIds = userRepository.findByRoleAndAddedBy(Role.EMPLOYEE, user.getId())
                .stream().map(User::getId).collect(Collectors.toList());
            teamUserIds.add(user.getId());
            
            totalLeads = leadRepository.countByAssignedUserIdIn(teamUserIds);
            totalSales = saleRepository.countBySoldByUserIdIn(teamUserIds);
            revenue = saleRepository.sumBySoldByUserIdIn(teamUserIds);
        } else if (user.getRole() == Role.SUB_ADMIN) {
            if ("location_based".equals(user.getSubscriptionType())) {
                String city = user.getAssignedCity();
                totalProjects = projectRepository.countByCityIgnoreCaseAndIsDeletedFalse(city);
                totalEmployees = userRepository.countByAssignedCityIgnoreCase(city);
                totalLeads = leadRepository.countByCityIgnoreCase(city);
                List<Long> pIds = projectRepository.findByCityIgnoreCaseAndIsDeletedFalse(city).stream().map(Project::getId).collect(Collectors.toList());
                totalSales = pIds.isEmpty() ? 0 : saleRepository.countByProjectIdIn(pIds);
                revenue = pIds.isEmpty() ? 0 : saleRepository.sumByProjectIdIn(pIds);
            } else {
                totalProjects = projectRepository.countByIsDeletedFalse();
                totalEmployees = userRepository.countByAddedBy(user.getId());
                
                List<Long> teamUserIds = userRepository.findByRoleAndAddedBy(Role.EMPLOYEE, user.getId())
                    .stream().map(User::getId).collect(Collectors.toList());
                teamUserIds.add(user.getId());
                
                totalLeads = leadRepository.countByAssignedUserIdIn(teamUserIds);
                totalSales = teamUserIds.isEmpty() ? 0 : saleRepository.countBySoldByUserIdIn(teamUserIds);
                revenue = teamUserIds.isEmpty() ? 0 : saleRepository.sumBySoldByUserIdIn(teamUserIds);
            }
        } else {
            // Employee
            totalProjects = projectRepository.countByUploadedByAndIsDeletedFalse(user.getId());
            totalEmployees = 0;
            totalLeads = leadRepository.countByAssignedUserId(user.getId());
            totalSales = saleRepository.countBySoldByUserId(user.getId());
            revenue = saleRepository.sumBySoldByUserId(user.getId());
        }

        return DashboardStatsResponse.builder()
                .totalProjects(totalProjects)
                .totalAdmins(totalAdmins)
                .totalSubAdmins(totalSubAdmins)
                .totalEmployees(totalEmployees)
                .totalLeads(totalLeads)
                .totalSales(totalSales)
                .revenue(revenue)
                .build();
    }

    public List<ActivityResponse> getRecentActivity() {
        User user = getCurrentUser();
        List<Activity> activities;

        if (user != null && user.getRole() == Role.SUB_ADMIN && "location_based".equals(user.getSubscriptionType())) {
            activities = activityRepository.findByCityOrderByTimestampDesc(user.getAssignedCity());
        } else {
            activities = activityRepository.findAllByOrderByTimestampDesc();
        }

        return activities.stream().limit(20).map(this::toActivityResponse).collect(Collectors.toList());
    }

    private ActivityResponse toActivityResponse(Activity activity) {
        return ActivityResponse.builder()
                .id(activity.getId())
                .type(activity.getType())
                .description(activity.getDescription())
                .userName(activity.getUserName())
                .projectName(activity.getProjectName())
                .city(activity.getCity())
                .timestamp(activity.getTimestamp())
                .units(activity.getUnits())
                .build();
    }
}
