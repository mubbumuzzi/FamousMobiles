package com.famousmobiles.service;

import java.util.List;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.annotation.Transactional;

import com.famousmobiles.domain.Customer;
import com.famousmobiles.dto.CustomerDto;
import com.famousmobiles.dto.TicketDto;
import com.famousmobiles.exception.BadRequestException;
import com.famousmobiles.exception.ResourceNotFoundException;
import com.famousmobiles.repository.CustomerRepository;
import com.famousmobiles.repository.RepairTicketRepository;

@Service
public class CustomerService {

    private final CustomerRepository customerRepository;
    private final RepairTicketRepository ticketRepository;
    private final TrackingNumberService trackingNumberService;

    public CustomerService(CustomerRepository customerRepository, RepairTicketRepository ticketRepository,
            TrackingNumberService trackingNumberService) {
        this.customerRepository = customerRepository;
        this.ticketRepository = ticketRepository;
        this.trackingNumberService = trackingNumberService;
    }

    @Transactional
    public CustomerDto.CustomerResponse create(CustomerDto.CustomerRequest request) {
        Customer customer = new Customer();
        apply(customer, request);
        customer.setCustomerCode(trackingNumberService.generateCustomerCode());
        return CustomerDto.CustomerResponse.from(customerRepository.save(customer));
    }

    @Transactional
    public CustomerDto.CustomerResponse update(UUID id, CustomerDto.CustomerRequest request) {
        Customer customer = getEntity(id);
        apply(customer, request);
        return CustomerDto.CustomerResponse.from(customerRepository.save(customer));
    }

    @Transactional(readOnly = true)
    public CustomerDto.CustomerResponse get(UUID id) {
        return CustomerDto.CustomerResponse.from(getEntity(id));
    }

    @Transactional(readOnly = true)
    public List<CustomerDto.CustomerResponse> search(String query) {
        if (query == null || query.isBlank()) {
            return customerRepository.findAll().stream().map(CustomerDto.CustomerResponse::from).toList();
        }
        return customerRepository.search(query.trim()).stream().map(CustomerDto.CustomerResponse::from).toList();
    }

    @Transactional(readOnly = true)
    public List<TicketDto.TicketResponse> getRepairHistory(UUID id) {
        getEntity(id);
        return ticketRepository.findByCustomerIdWithDetailsOrderByCreatedAtDesc(id).stream()
                .map(TicketDto.TicketResponse::from).toList();
    }

    public Customer getEntity(UUID id) {
        return customerRepository.findById(id).orElseThrow(() -> new ResourceNotFoundException("Customer not found"));
    }

    private void apply(Customer customer, CustomerDto.CustomerRequest request) {
        String mobile = normalizeMobile(request.mobile());
        if (mobile.isBlank()) {
            throw new BadRequestException("Mobile number is required");
        }
        customer.setFullName(request.fullName().trim());
        customer.setMobile(mobile);
        customer.setAlternateMobile(normalizeOptionalMobile(request.alternateMobile()));
        customer.setAddress(trimOrNull(request.address()));
        customer.setArea(trimOrNull(request.area()));
        customer.setCity(trimOrNull(request.city()));
        customer.setNotes(trimOrNull(request.notes()));
    }

    private String normalizeMobile(String mobile) {
        return mobile == null ? "" : mobile.trim().replaceAll("\\s+", "");
    }

    private String normalizeOptionalMobile(String mobile) {
        if (mobile == null || mobile.isBlank()) return null;
        return normalizeMobile(mobile);
    }

    private String trimOrNull(String value) {
        if (value == null || value.isBlank()) return null;
        return value.trim();
    }
}
