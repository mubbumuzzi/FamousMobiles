package com.famousmobiles.service;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.famousmobiles.domain.AccessorySale;
import com.famousmobiles.domain.Customer;
import com.famousmobiles.domain.Store;
import com.famousmobiles.domain.User;
import com.famousmobiles.dto.AccessorySaleDto;
import com.famousmobiles.dto.CustomerDto;
import com.famousmobiles.exception.BadRequestException;
import com.famousmobiles.exception.ResourceNotFoundException;
import com.famousmobiles.repository.AccessorySaleRepository;
import com.famousmobiles.repository.CustomerRepository;
import com.famousmobiles.repository.StoreRepository;
import com.famousmobiles.security.SecurityUtils;

@Service
public class AccessorySaleService {

    private final AccessorySaleRepository accessorySaleRepository;
    private final CustomerRepository customerRepository;
    private final CustomerService customerService;
    private final StoreRepository storeRepository;
    private final TrackingNumberService trackingNumberService;
    private final SecurityUtils securityUtils;

    public AccessorySaleService(
            AccessorySaleRepository accessorySaleRepository,
            CustomerRepository customerRepository,
            CustomerService customerService,
            StoreRepository storeRepository,
            TrackingNumberService trackingNumberService,
            SecurityUtils securityUtils
    ) {
        this.accessorySaleRepository = accessorySaleRepository;
        this.customerRepository = customerRepository;
        this.customerService = customerService;
        this.storeRepository = storeRepository;
        this.trackingNumberService = trackingNumberService;
        this.securityUtils = securityUtils;
    }

    @Transactional
    public AccessorySaleDto.AccessorySaleResponse create(AccessorySaleDto.CreateAccessorySaleRequest req) {
        if (req.accessoryName() == null || req.accessoryName().trim().isEmpty()) {
            throw new BadRequestException("Accessory name is required");
        }
        if (req.price() == null || req.price().compareTo(BigDecimal.ZERO) <= 0) {
            throw new BadRequestException("Price must be greater than zero");
        }

        String rawMobile = req.customerMobile() != null ? req.customerMobile().trim().replaceAll("\\s+", "") : "";
        String cleanMobile = rawMobile.length() > 10 ? rawMobile.substring(rawMobile.length() - 10) : rawMobile;

        Customer customer = null;
        if (!cleanMobile.isEmpty()) {
            var phoneOpt = customerRepository.findPhoneByMobile(cleanMobile);
            if (phoneOpt.isPresent()) {
                customer = phoneOpt.get().getCustomer();
            } else if (cleanMobile.length() >= 10) {
                String name = req.customerName() != null && !req.customerName().isBlank()
                        ? req.customerName().trim()
                        : "Customer " + cleanMobile;
                if (name.length() < 4) {
                    name = name + " Cust";
                }
                var custResp = customerService.create(new CustomerDto.CustomerRequest(
                        name,
                        List.of(new CustomerDto.MobileEntry(cleanMobile, "Primary", true)),
                        cleanMobile,
                        null,
                        null,
                        null,
                        null,
                        "Auto-created from accessory sale"
                ));
                customer = customerRepository.findById(custResp.id()).orElse(null);
            }
        }

        User currentUser = null;
        try {
            currentUser = securityUtils.getCurrentUser();
        } catch (Exception ignored) {}

        Store store = null;
        if (storeRepository != null) {
            if (req.storeId() != null) {
                store = storeRepository.findById(req.storeId()).orElse(null);
            } else if (currentUser != null && currentUser.getDefaultStore() != null) {
                store = currentUser.getDefaultStore();
            } else {
                store = storeRepository.findByCode("FM1").orElse(null);
            }
        }

        String displayName = "Walk-in Customer";
        if (req.customerName() != null && !req.customerName().isBlank()) {
            displayName = req.customerName().trim();
        } else if (customer != null) {
            displayName = customer.getFullName();
        }

        int warrantyMonths = req.warrantyMonths() != null && req.warrantyMonths() > 0 ? req.warrantyMonths() : 0;
        LocalDate expiryDate = warrantyMonths > 0 ? LocalDate.now().plusMonths(warrantyMonths) : null;

        String paymentMode = req.paymentMode() != null && !req.paymentMode().isBlank()
                ? req.paymentMode().trim().toUpperCase()
                : "UPI";

        AccessorySale sale = new AccessorySale();
        sale.setBillNumber(trackingNumberService.generateAccessoryBillNumber());
        sale.setCustomer(customer);
        sale.setCustomerName(displayName);
        sale.setCustomerMobile(cleanMobile.isEmpty() ? "0000000000" : cleanMobile);
        sale.setAccessoryName(req.accessoryName().trim());
        sale.setPrice(req.price());
        sale.setPaymentMode(paymentMode);
        sale.setWarrantyMonths(warrantyMonths);
        sale.setWarrantyExpiresAt(expiryDate);
        sale.setSerialNumber(req.serialNumber() != null ? req.serialNumber().trim() : null);
        sale.setNotes(req.notes());
        sale.setSoldBy(currentUser);
        sale.setStore(store);
        sale.setSoldAt(Instant.now());

        AccessorySale saved = accessorySaleRepository.save(sale);
        return AccessorySaleDto.AccessorySaleResponse.from(saved);
    }

    @Transactional(readOnly = true)
    public AccessorySale getEntity(UUID id) {
        return accessorySaleRepository.findByIdWithDetails(id)
                .orElseThrow(() -> new ResourceNotFoundException("Accessory sale bill not found"));
    }

    @Transactional(readOnly = true)
    public AccessorySaleDto.AccessorySaleResponse getById(UUID id) {
        return AccessorySaleDto.AccessorySaleResponse.from(getEntity(id));
    }

    @Transactional(readOnly = true)
    public List<AccessorySaleDto.AccessorySaleResponse> list(String query, int page, int size) {
        if (query != null && !query.trim().isEmpty()) {
            return accessorySaleRepository.search(query.trim(), PageRequest.of(Math.max(0, page), Math.max(1, size)))
                    .getContent()
                    .stream()
                    .map(AccessorySaleDto.AccessorySaleResponse::from)
                    .toList();
        }
        return accessorySaleRepository.findTop50ByOrderBySoldAtDesc()
                .stream()
                .map(AccessorySaleDto.AccessorySaleResponse::from)
                .toList();
    }
}
