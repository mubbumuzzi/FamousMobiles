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
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.famousmobiles.dto.CustomerDto;
import com.famousmobiles.dto.TicketDto;
import com.famousmobiles.service.CustomerService;

@RestController
@RequestMapping("/api/customers")
@PreAuthorize("hasAnyRole('ADMIN', 'RECEPTION', 'TECHNICIAN')")
public class CustomerController {

    private final CustomerService customerService;

    public CustomerController(CustomerService customerService) {
        this.customerService = customerService;
    }

    @GetMapping
    public List<CustomerDto.CustomerResponse> search(@RequestParam(required = false) String q) {
        return customerService.search(q);
    }

    @GetMapping("/{id}")
    public CustomerDto.CustomerResponse get(@PathVariable UUID id) {
        return customerService.get(id);
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'RECEPTION')")
    public CustomerDto.CustomerResponse create(@RequestBody CustomerDto.CustomerRequest request) {
        return customerService.create(request);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'RECEPTION')")
    public CustomerDto.CustomerResponse update(@PathVariable UUID id, @RequestBody CustomerDto.CustomerRequest request) {
        return customerService.update(id, request);
    }

    @GetMapping("/{id}/repairs")
    public List<TicketDto.TicketResponse> repairs(@PathVariable UUID id) {
        return customerService.getRepairHistory(id);
    }
}
