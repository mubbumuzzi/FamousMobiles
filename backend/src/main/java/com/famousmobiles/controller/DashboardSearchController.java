package com.famousmobiles.controller;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.famousmobiles.dto.MiscDto;
import com.famousmobiles.security.SecurityUtils;
import com.famousmobiles.service.DashboardService;
import com.famousmobiles.service.SearchService;

@RestController
@RequestMapping("/api")
public class DashboardSearchController {

    private final DashboardService dashboardService;
    private final SearchService searchService;
    private final SecurityUtils securityUtils;

    public DashboardSearchController(DashboardService dashboardService, SearchService searchService,
            SecurityUtils securityUtils) {
        this.dashboardService = dashboardService;
        this.searchService = searchService;
        this.securityUtils = securityUtils;
    }

    @GetMapping("/dashboard/metrics")
    @PreAuthorize("hasAnyRole('ADMIN', 'SALESMAN', 'TECHNICIAN')")
    public MiscDto.DashboardMetrics metrics() {
        return dashboardService.getMetrics(securityUtils.isAdmin());
    }

    @GetMapping("/search")
    @PreAuthorize("hasAnyRole('ADMIN', 'SALESMAN', 'TECHNICIAN')")
    public MiscDto.SearchResult search(@RequestParam String q) {
        return searchService.search(q);
    }
}
