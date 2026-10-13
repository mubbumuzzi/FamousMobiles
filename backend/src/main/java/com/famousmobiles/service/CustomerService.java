package com.famousmobiles.service;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.famousmobiles.domain.Customer;
import com.famousmobiles.domain.CustomerPhone;
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
        apply(customer, request, null);
        customer.setCustomerCode(trackingNumberService.generateCustomerCode());
        return CustomerDto.CustomerResponse.from(customerRepository.save(customer));
    }

    @Transactional
    public CustomerDto.CustomerResponse update(UUID id, CustomerDto.CustomerRequest request) {
        Customer customer = getEntity(id);
        apply(customer, request, id);
        return CustomerDto.CustomerResponse.from(customerRepository.save(customer));
    }

    @Transactional(readOnly = true)
    public CustomerDto.CustomerResponse get(UUID id) {
        return CustomerDto.CustomerResponse.from(getEntity(id));
    }

    @Transactional(readOnly = true)
    public CustomerDto.CustomerResponse lookupByMobile(String mobile) {
        String normalized = normalizeMobile(mobile);
        if (normalized.isBlank()) {
            throw new BadRequestException("Mobile number is required");
        }
        CustomerPhone phone = customerRepository.findPhoneByMobile(normalized)
                .orElseThrow(() -> new ResourceNotFoundException("No customer found for this mobile number"));
        return CustomerDto.CustomerResponse.from(phone.getCustomer(), phone.getMobile());
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

    private void apply(Customer customer, CustomerDto.CustomerRequest request, UUID currentCustomerId) {
        if (request.fullName() == null || request.fullName().trim().length() < 4) {
            throw new BadRequestException("Full name must be at least 4 characters");
        }

        List<CustomerDto.MobileEntry> requestMobiles = request.resolveMobiles();
        if (requestMobiles == null || requestMobiles.isEmpty()) {
            throw new BadRequestException("At least one mobile number is required");
        }

        List<NormalizedMobile> normalized = new ArrayList<>();
        Set<String> seenInRequest = new HashSet<>();
        for (CustomerDto.MobileEntry entry : requestMobiles) {
            String number = normalizeMobile(entry.number());
            if (number.isBlank()) {
                continue;
            }
            if (!seenInRequest.add(number)) {
                throw new BadRequestException("Duplicate mobile in request: " + number);
            }
            String label = trimOrNull(entry.label());
            boolean isPrimary = Boolean.TRUE.equals(entry.isPrimary());
            normalized.add(new NormalizedMobile(number, label, isPrimary));
        }

        if (normalized.isEmpty()) {
            throw new BadRequestException("At least one mobile number is required");
        }

        boolean hasPrimary = normalized.stream().anyMatch(NormalizedMobile::isPrimary);
        if (!hasPrimary) {
            NormalizedMobile first = normalized.get(0);
            normalized.set(0, new NormalizedMobile(first.number(), first.label() != null ? first.label() : "Primary", true));
        } else {
            // Ensure only one primary
            boolean primarySeen = false;
            for (int i = 0; i < normalized.size(); i++) {
                NormalizedMobile m = normalized.get(i);
                if (m.isPrimary()) {
                    if (primarySeen) {
                        normalized.set(i, new NormalizedMobile(m.number(), m.label(), false));
                    } else {
                        primarySeen = true;
                    }
                }
            }
        }

        for (NormalizedMobile m : normalized) {
            customerRepository.findPhoneByMobile(m.number()).ifPresent(existing -> {
                UUID ownerId = existing.getCustomer().getId();
                if (currentCustomerId == null || !ownerId.equals(currentCustomerId)) {
                    throw new BadRequestException(
                            "Mobile " + m.number() + " already belongs to " + existing.getCustomer().getFullName()
                                    + " (" + existing.getCustomer().getCustomerCode() + ")");
                }
            });
        }

        String primaryNumber = normalized.stream()
                .filter(NormalizedMobile::isPrimary)
                .map(NormalizedMobile::number)
                .findFirst()
                .orElse(normalized.get(0).number());

        customer.setFullName(request.fullName().trim());
        customer.setMobile(primaryNumber);
        customer.setAddress(trimOrNull(request.address()));
        customer.setArea(trimOrNull(request.area()));
        customer.setCity(trimOrNull(request.city()));
        customer.setNotes(trimOrNull(request.notes()));

        // In-place phone synchronization: preserve existing phone IDs, update labels/primary status,
        // remove phones no longer present, and append genuinely new numbers.
        Map<String, CustomerPhone> existingByNumber = customer.getPhones().stream()
                .collect(Collectors.toMap(CustomerPhone::getMobile, Function.identity(), (a, b) -> a));

        customer.getPhones().removeIf(p -> normalized.stream().noneMatch(n -> n.number().equals(p.getMobile())));

        for (NormalizedMobile m : normalized) {
            CustomerPhone existing = existingByNumber.get(m.number());
            if (existing != null) {
                existing.setLabel(m.label() != null ? m.label() : (m.isPrimary() ? "Primary" : null));
                existing.setPrimary(m.isPrimary());
            } else {
                CustomerPhone newPhone = new CustomerPhone();
                newPhone.setCustomer(customer);
                newPhone.setMobile(m.number());
                newPhone.setLabel(m.label() != null ? m.label() : (m.isPrimary() ? "Primary" : null));
                newPhone.setPrimary(m.isPrimary());
                customer.getPhones().add(newPhone);
            }
        }
    }

    private String normalizeMobile(String mobile) {
        return mobile == null ? "" : mobile.trim().replaceAll("\\s+", "");
    }

    private String trimOrNull(String value) {
        if (value == null || value.isBlank()) return null;
        return value.trim();
    }

    private record NormalizedMobile(String number, String label, boolean isPrimary) {}
}
