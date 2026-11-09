package com.famousmobiles;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.famousmobiles.domain.AccessorySale;
import com.famousmobiles.domain.User;
import com.famousmobiles.domain.enums.UserRole;
import com.famousmobiles.dto.AccessorySaleDto;
import com.famousmobiles.dto.CustomerDto;
import com.famousmobiles.repository.AccessorySaleRepository;
import com.famousmobiles.repository.CustomerRepository;
import com.famousmobiles.repository.StoreRepository;
import com.famousmobiles.security.SecurityUtils;
import com.famousmobiles.service.AccessorySaleService;
import com.famousmobiles.service.CustomerService;
import com.famousmobiles.service.TrackingNumberService;

@ExtendWith(MockitoExtension.class)
class AccessorySaleServiceTest {

    @Mock
    private AccessorySaleRepository accessorySaleRepository;

    @Mock
    private CustomerRepository customerRepository;

    @Mock
    private CustomerService customerService;

    @Mock
    private StoreRepository storeRepository;

    @Mock
    private TrackingNumberService trackingNumberService;

    @Mock
    private SecurityUtils securityUtils;

    @InjectMocks
    private AccessorySaleService accessorySaleService;

    private User staffUser;

    @BeforeEach
    void setUp() {
        staffUser = new User();
        staffUser.setId(UUID.randomUUID());
        staffUser.setFullName("Basheer Uddin");
        staffUser.setRole(UserRole.SALESMAN);
    }

    @Test
    void create_validSaleWithWarranty_shouldSaveAndReturnResponse() {
        when(trackingNumberService.generateAccessoryBillNumber()).thenReturn("FM-ACC-2026-00001");
        when(securityUtils.getCurrentUser()).thenReturn(staffUser);
        when(customerRepository.findPhoneByMobile("9876543210")).thenReturn(Optional.empty());
        when(customerService.create(any(CustomerDto.CustomerRequest.class))).thenReturn(
                new CustomerDto.CustomerResponse(UUID.randomUUID(), "CUST-101", "Rahul Sharma", "9876543210", null, null, null, null, null, null, null, null)
        );
        when(accessorySaleRepository.save(any(AccessorySale.class))).thenAnswer(invocation -> {
            AccessorySale s = invocation.getArgument(0);
            s.setId(UUID.randomUUID());
            s.setCreatedAt(Instant.now());
            return s;
        });

        AccessorySaleDto.CreateAccessorySaleRequest req = new AccessorySaleDto.CreateAccessorySaleRequest(
                "Boat Airdopes 141 Bluetooth Earbuds",
                new BigDecimal("1299.00"),
                "UPI",
                3, // 3 months warranty
                "SN-BOAT-9921",
                "Rahul Sharma",
                "9876543210",
                "Box seal intact",
                null
        );

        AccessorySaleDto.AccessorySaleResponse resp = accessorySaleService.create(req);

        assertNotNull(resp);
        assertEquals("FM-ACC-2026-00001", resp.billNumber());
        assertEquals("Boat Airdopes 141 Bluetooth Earbuds", resp.accessoryName());
        assertEquals(new BigDecimal("1299.00"), resp.price());
        assertEquals("UPI", resp.paymentMode());
        assertEquals(3, resp.warrantyMonths());
        assertEquals(LocalDate.now().plusMonths(3), resp.warrantyExpiresAt());
        assertEquals("Rahul Sharma", resp.customerName());
        assertEquals("9876543210", resp.customerMobile());
        assertEquals("Basheer Uddin", resp.soldByName());
        verify(accessorySaleRepository).save(any(AccessorySale.class));
    }
}
