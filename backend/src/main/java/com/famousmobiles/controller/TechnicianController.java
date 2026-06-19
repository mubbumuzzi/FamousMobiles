package com.famousmobiles.controller;

import java.util.List;
import java.util.UUID;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.famousmobiles.dto.MiscDto;
import com.famousmobiles.service.TechnicianService;

@RestController
@RequestMapping("/api/technicians")
public class TechnicianController {

    private final TechnicianService technicianService;

    public TechnicianController(TechnicianService technicianService) {
        this.technicianService = technicianService;
    }

    @GetMapping
    public List<MiscDto.TechnicianResponse> list() {
        return technicianService.list();
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public MiscDto.TechnicianResponse create(@RequestBody MiscDto.TechnicianRequest request) {
        return technicianService.create(request);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public MiscDto.TechnicianResponse update(@PathVariable UUID id, @RequestBody MiscDto.TechnicianRequest request) {
        return technicianService.update(id, request);
    }

    @GetMapping("/{id}/performance")
    public MiscDto.TechnicianResponse performance(@PathVariable UUID id) {
        return technicianService.getPerformance(id);
    }
}
