package com.famousmobiles.controller;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.famousmobiles.dto.MiscDto;
import com.famousmobiles.service.DashboardService;
import com.famousmobiles.service.SearchService;

@RestController
@RequestMapping("/api")
public class DashboardSearchController {

    private final DashboardService dashboardService;
    private final SearchService searchService;

    public DashboardSearchController(DashboardService dashboardService, SearchService searchService) {
        this.dashboardService = dashboardService;
        this.searchService = searchService;
    }

    @GetMapping("/dashboard/metrics")
    public MiscDto.DashboardMetrics metrics(Authentication authentication) {
        boolean includeRevenue = authentication != null && authentication.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .anyMatch("ROLE_ADMIN"::equals);
        return dashboardService.getMetrics(includeRevenue);
    }

    @GetMapping("/search")
    public MiscDto.SearchResult search(@RequestParam String q) {
        return searchService.search(q);
    }
}
