package com.famousmobiles.controller;

import java.util.List;
import java.util.UUID;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.famousmobiles.domain.Store;
import com.famousmobiles.dto.StoreDto;
import com.famousmobiles.exception.ResourceNotFoundException;
import com.famousmobiles.repository.StoreRepository;

@RestController
@RequestMapping("/api/stores")
public class StoreController {

    private final StoreRepository storeRepository;

    public StoreController(StoreRepository storeRepository) {
        this.storeRepository = storeRepository;
    }

    @GetMapping
    public List<StoreDto.StoreResponse> list() {
        return storeRepository.findByActiveTrueOrderByCodeAsc().stream()
                .map(StoreDto.StoreResponse::from)
                .toList();
    }

    @GetMapping("/{id}")
    public StoreDto.StoreResponse get(@PathVariable UUID id) {
        Store store = storeRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Store not found"));
        return StoreDto.StoreResponse.from(store);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public StoreDto.StoreResponse update(@PathVariable UUID id, @RequestBody StoreDto.UpdateStoreRequest request) {
        Store store = storeRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Store not found"));

        if (request.name() != null && !request.name().isBlank()) store.setName(request.name().trim());
        if (request.displayName() != null && !request.displayName().isBlank()) store.setDisplayName(request.displayName().trim());
        if (request.mobile() != null && !request.mobile().isBlank()) store.setMobile(request.mobile().trim());
        if (request.alternateMobile() != null) store.setAlternateMobile(request.alternateMobile().trim());
        if (request.ownerName() != null && !request.ownerName().isBlank()) store.setOwnerName(request.ownerName().trim());
        if (request.addressLine1() != null && !request.addressLine1().isBlank()) store.setAddressLine1(request.addressLine1().trim());
        if (request.addressLine2() != null) store.setAddressLine2(request.addressLine2().trim());
        if (request.city() != null && !request.city().isBlank()) store.setCity(request.city().trim());
        if (request.pincode() != null) store.setPincode(request.pincode().trim());
        if (request.terms() != null) store.setTerms(request.terms());

        Store saved = storeRepository.save(store);
        return StoreDto.StoreResponse.from(saved);
    }
}
