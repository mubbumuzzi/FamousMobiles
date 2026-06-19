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

import com.famousmobiles.domain.enums.InventoryTransactionType;
import com.famousmobiles.dto.MiscDto;
import com.famousmobiles.service.InventoryService;

@RestController
@RequestMapping("/api/inventory")
@PreAuthorize("hasRole('ADMIN')")
public class InventoryController {

    private final InventoryService inventoryService;

    public InventoryController(InventoryService inventoryService) {
        this.inventoryService = inventoryService;
    }

    @GetMapping
    public List<MiscDto.InventoryItemResponse> list() {
        return inventoryService.list();
    }

    @GetMapping("/low-stock")
    public List<MiscDto.InventoryItemResponse> lowStock() {
        return inventoryService.lowStock();
    }

    @PostMapping
    public MiscDto.InventoryItemResponse create(@RequestBody MiscDto.InventoryItemRequest request) {
        return inventoryService.create(request);
    }

    @PutMapping("/{id}")
    public MiscDto.InventoryItemResponse update(@PathVariable UUID id, @RequestBody MiscDto.InventoryItemRequest request) {
        return inventoryService.update(id, request);
    }

    @PostMapping("/{id}/adjust")
    public MiscDto.InventoryItemResponse adjust(@PathVariable UUID id, @RequestBody MiscDto.InventoryAdjustRequest request) {
        return inventoryService.adjust(id, request, InventoryTransactionType.ADD);
    }

    @PostMapping("/{id}/deduct")
    public MiscDto.InventoryItemResponse deduct(@PathVariable UUID id, @RequestBody MiscDto.InventoryAdjustRequest request) {
        return inventoryService.adjust(id, request, InventoryTransactionType.DEDUCT);
    }
}
