package com.famousmobiles.controller;

import org.springframework.security.access.prepost.PreAuthorize;
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
    @PreAuthorize("hasAnyRole('ADMIN', 'RECEPTION', 'TECHNICIAN')")
    public MiscDto.DashboardMetrics metrics() {
        return dashboardService.getMetrics();
    }

    @GetMapping("/search")
    @PreAuthorize("hasAnyRole('ADMIN', 'RECEPTION', 'TECHNICIAN')")
    public MiscDto.SearchResult search(@RequestParam String q) {
        return searchService.search(q);
    }
}
