package com.famousmobiles.service;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.famousmobiles.domain.Customer;
import com.famousmobiles.domain.StockOrder;
import com.famousmobiles.domain.User;
import com.famousmobiles.domain.enums.StockOrderStatus;
import com.famousmobiles.dto.CustomerDto;
import com.famousmobiles.dto.StockOrderDto;
import com.famousmobiles.exception.BadRequestException;
import com.famousmobiles.exception.ResourceNotFoundException;
import com.famousmobiles.repository.CustomerRepository;
import com.famousmobiles.repository.StockOrderRepository;
import com.famousmobiles.security.SecurityUtils;

@Service
public class StockOrderService {

    private final StockOrderRepository stockOrderRepository;
    private final CustomerRepository customerRepository;
    private final CustomerService customerService;
    private final TrackingNumberService trackingNumberService;
    private final SecurityUtils securityUtils;

    public StockOrderService(
            StockOrderRepository stockOrderRepository,
            CustomerRepository customerRepository,
            CustomerService customerService,
            TrackingNumberService trackingNumberService,
            SecurityUtils securityUtils
    ) {
        this.stockOrderRepository = stockOrderRepository;
        this.customerRepository = customerRepository;
        this.customerService = customerService;
        this.trackingNumberService = trackingNumberService;
        this.securityUtils = securityUtils;
    }

    @Transactional
    public StockOrderDto.StockOrderResponse create(StockOrderDto.CreateStockOrderRequest req) {
        if (req.itemDetails() == null || req.itemDetails().trim().isEmpty()) {
            throw new BadRequestException("Item / accessory details are required");
        }

        String cleanMobile = null;
        Customer customer = null;

        if (req.customerMobile() != null && !req.customerMobile().trim().isEmpty()) {
            String rawMobile = req.customerMobile().trim().replaceAll("\\s+", "");
            cleanMobile = rawMobile.length() > 10 ? rawMobile.substring(rawMobile.length() - 10) : rawMobile;

            // Auto-link or auto-create Customer
            if (req.customerId() != null) {
                customer = customerRepository.findById(req.customerId()).orElse(null);
            }
            if (customer == null && !cleanMobile.isEmpty()) {
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
                            "Auto-created from stock demand order"
                    ));
                    customer = customerRepository.findById(custResp.id()).orElse(null);
                }
            }
        }

        User currentUser = null;
        try {
            currentUser = securityUtils.getCurrentUser();
        } catch (Exception ignored) {
            // allow service calls if running without user context in tests
        }

        String displayName = "Shop Stock";
        if (req.customerName() != null && !req.customerName().isBlank()) {
            displayName = req.customerName().trim();
        } else if (customer != null) {
            displayName = customer.getFullName();
        } else if (cleanMobile != null && !cleanMobile.isBlank()) {
            displayName = "Customer " + cleanMobile;
        }

        StockOrder order = new StockOrder();
        order.setOrderCode(trackingNumberService.generateStockOrderCode());
        order.setCustomer(customer);
        order.setCustomerName(displayName);
        order.setCustomerMobile(cleanMobile);
        order.setItemDetails(req.itemDetails().trim());
        order.setQuantity(req.quantity() != null && req.quantity() > 0 ? req.quantity() : 1);
        order.setAdvanceAmount(req.advanceAmount() != null && req.advanceAmount().compareTo(BigDecimal.ZERO) >= 0
                ? req.advanceAmount()
                : BigDecimal.ZERO);
        order.setExpectedPrice(req.expectedPrice());
        order.setStatus(StockOrderStatus.PENDING);
        order.setNotes(req.notes());
        order.setCreatedBy(currentUser);

        StockOrder saved = stockOrderRepository.save(order);
        return StockOrderDto.StockOrderResponse.from(saved);
    }

    @Transactional(readOnly = true)
    public List<StockOrderDto.StockOrderResponse> list(String filter) {
        Instant now = Instant.now();
        Instant sevenDaysAgo = now.minus(7, ChronoUnit.DAYS);
        Instant fourteenDaysAgo = now.minus(14, ChronoUnit.DAYS);

        if ("ACTIVE".equalsIgnoreCase(filter) || filter == null || filter.isBlank()) {
            // PENDING orders (never cleared - wholesale can take 20+ days)
            // PLUS ARRIVED orders received within the last 7 days!
            return stockOrderRepository.findAllByOrderByCreatedAtDesc().stream()
                    .filter(o -> {
                        if (o.getStatus() == StockOrderStatus.PENDING) {
                            return true; // Never auto-cleared!
                        }
                        if (o.getStatus() == StockOrderStatus.ARRIVED) {
                            Instant arrived = o.getArrivedAt() != null ? o.getArrivedAt() : o.getCreatedAt();
                            return !arrived.isBefore(sevenDaysAgo); // Active for 7 days after arrival
                        }
                        return false;
                    })
                    .map(StockOrderDto.StockOrderResponse::from)
                    .toList();
        } else if ("FULFILLED".equalsIgnoreCase(filter)) {
            // Fulfilled history kept for 14 days (Option B)
            return stockOrderRepository.findByStatusOrderByCreatedAtDesc(StockOrderStatus.FULFILLED).stream()
                    .filter(o -> {
                        Instant fulfilled = o.getFulfilledAt() != null ? o.getFulfilledAt() : o.getUpdatedAt();
                        return !fulfilled.isBefore(fourteenDaysAgo);
                    })
                    .map(StockOrderDto.StockOrderResponse::from)
                    .toList();
        } else if ("UNCLAIMED".equalsIgnoreCase(filter) || "SHELF".equalsIgnoreCase(filter)) {
            // Arrived at shop more than 7 days ago, customer didn't collect -> put to shelf for other customers
            return stockOrderRepository.findByStatusOrderByCreatedAtDesc(StockOrderStatus.ARRIVED).stream()
                    .filter(o -> {
                        Instant arrived = o.getArrivedAt() != null ? o.getArrivedAt() : o.getCreatedAt();
                        return arrived.isBefore(sevenDaysAgo);
                    })
                    .map(StockOrderDto.StockOrderResponse::from)
                    .toList();
        } else if ("ALL".equalsIgnoreCase(filter)) {
            return stockOrderRepository.findAllByOrderByCreatedAtDesc()
                    .stream().map(StockOrderDto.StockOrderResponse::from).toList();
        } else {
            try {
                StockOrderStatus st = StockOrderStatus.valueOf(filter.toUpperCase());
                return stockOrderRepository.findByStatusOrderByCreatedAtDesc(st)
                        .stream().map(StockOrderDto.StockOrderResponse::from).toList();
            } catch (IllegalArgumentException e) {
                return list("ACTIVE");
            }
        }
    }

    @Transactional
    public StockOrderDto.StockOrderResponse updateStatus(UUID id, StockOrderDto.UpdateStockOrderStatusRequest req) {
        StockOrder order = stockOrderRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Stock order not found"));

        if (req.status() != null) {
            order.setStatus(req.status());
            if (req.status() == StockOrderStatus.ARRIVED && order.getArrivedAt() == null) {
                order.setArrivedAt(Instant.now());
            } else if (req.status() == StockOrderStatus.FULFILLED && order.getFulfilledAt() == null) {
                order.setFulfilledAt(Instant.now());
            }
        }
        if (req.notes() != null) {
            order.setNotes(req.notes());
        }

        return StockOrderDto.StockOrderResponse.from(stockOrderRepository.save(order));
    }

    @Transactional
    public void delete(UUID id) {
        if (!stockOrderRepository.existsById(id)) {
            throw new ResourceNotFoundException("Stock order not found");
        }
        stockOrderRepository.deleteById(id);
    }
}
