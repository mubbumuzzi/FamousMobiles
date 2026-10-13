package com.famousmobiles;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.famousmobiles.domain.Customer;
import com.famousmobiles.domain.CustomerPhone;
import com.famousmobiles.domain.RepairTicket;
import com.famousmobiles.domain.enums.DeviceType;
import com.famousmobiles.domain.enums.RepairStatus;
import com.famousmobiles.dto.CustomerDto;
import com.famousmobiles.dto.TicketDto;
import com.famousmobiles.exception.BadRequestException;
import com.famousmobiles.exception.ResourceNotFoundException;
import com.famousmobiles.repository.CustomerRepository;
import com.famousmobiles.repository.RepairTicketRepository;
import com.famousmobiles.service.CustomerService;
import com.famousmobiles.service.TrackingNumberService;

@ExtendWith(MockitoExtension.class)
class CustomerServiceTest {

    @Mock
    private CustomerRepository customerRepository;

    @Mock
    private RepairTicketRepository ticketRepository;

    @Mock
    private TrackingNumberService trackingNumberService;

    @InjectMocks
    private CustomerService customerService;

    private UUID customerId;

    @BeforeEach
    void setUp() {
        customerId = UUID.randomUUID();
    }

    @Test
    void create_validCustomer_success() {
        when(trackingNumberService.generateCustomerCode()).thenReturn("CUST-1001");
        when(customerRepository.findPhoneByMobile("9876543210")).thenReturn(Optional.empty());
        when(customerRepository.save(any(Customer.class))).thenAnswer(invocation -> {
            Customer c = invocation.getArgument(0);
            c.setId(customerId);
            c.setCreatedAt(Instant.now());
            return c;
        });

        CustomerDto.CustomerRequest request = new CustomerDto.CustomerRequest(
                "John Doe",
                null,
                "9876543210",
                null,
                "Street 1",
                "Downtown",
                "Hyderabad",
                "VIP"
        );

        CustomerDto.CustomerResponse res = customerService.create(request);

        assertNotNull(res);
        assertEquals(customerId, res.id());
        assertEquals("John Doe", res.fullName());
        assertEquals("9876543210", res.mobile());
        assertEquals("CUST-1001", res.customerCode());
        verify(customerRepository).save(any(Customer.class));
    }

    @Test
    void create_fullNameLessThan4Characters_throwsBadRequestException() {
        CustomerDto.CustomerRequest request = new CustomerDto.CustomerRequest(
                "Bob",
                null,
                "9876543210",
                null,
                null,
                null,
                null,
                null
        );

        BadRequestException ex = assertThrows(BadRequestException.class, () -> customerService.create(request));
        assertEquals("Full name must be at least 4 characters", ex.getMessage());
    }

    @Test
    void create_nullFullName_throwsBadRequestException() {
        CustomerDto.CustomerRequest request = new CustomerDto.CustomerRequest(
                null,
                null,
                "9876543210",
                null,
                null,
                null,
                null,
                null
        );

        BadRequestException ex = assertThrows(BadRequestException.class, () -> customerService.create(request));
        assertEquals("Full name must be at least 4 characters", ex.getMessage());
    }

    @Test
    void create_emptyMobile_throwsBadRequestException() {
        CustomerDto.CustomerRequest request = new CustomerDto.CustomerRequest(
                "John Doe",
                null,
                "",
                null,
                null,
                null,
                null,
                null
        );

        BadRequestException ex = assertThrows(BadRequestException.class, () -> customerService.create(request));
        assertEquals("At least one mobile number is required", ex.getMessage());
    }

    @Test
    void create_duplicateMobileInRequest_throwsBadRequestException() {
        List<CustomerDto.MobileEntry> mobiles = List.of(
                new CustomerDto.MobileEntry("9876543210", "Primary", true),
                new CustomerDto.MobileEntry("9876543210", "Work", false)
        );
        CustomerDto.CustomerRequest request = new CustomerDto.CustomerRequest(
                "John Doe",
                mobiles,
                null,
                null,
                null,
                null,
                null,
                null
        );

        BadRequestException ex = assertThrows(BadRequestException.class, () -> customerService.create(request));
        assertEquals("Duplicate mobile in request: 9876543210", ex.getMessage());
    }

    @Test
    void create_mobileBelongsToExistingCustomer_throwsBadRequestException() {
        Customer existingOwner = new Customer();
        existingOwner.setId(UUID.randomUUID());
        existingOwner.setFullName("Existing User");
        existingOwner.setCustomerCode("CUST-0099");

        CustomerPhone existingPhone = new CustomerPhone();
        existingPhone.setCustomer(existingOwner);
        existingPhone.setMobile("9876543210");

        when(customerRepository.findPhoneByMobile("9876543210")).thenReturn(Optional.of(existingPhone));

        CustomerDto.CustomerRequest request = new CustomerDto.CustomerRequest(
                "John Doe",
                null,
                "9876543210",
                null,
                null,
                null,
                null,
                null
        );

        BadRequestException ex = assertThrows(BadRequestException.class, () -> customerService.create(request));
        assertEquals("Mobile 9876543210 already belongs to Existing User (CUST-0099)", ex.getMessage());
    }

    @Test
    void lookupByMobile_exactMatch_returnsCustomerResponse() {
        Customer customer = new Customer();
        customer.setId(customerId);
        customer.setCustomerCode("CUST-1001");
        customer.setFullName("Alice Smith");
        customer.setMobile("9876543210");
        customer.setCreatedAt(Instant.now());

        CustomerPhone phone = new CustomerPhone();
        phone.setCustomer(customer);
        phone.setMobile("9876543210");
        phone.setPrimary(true);

        when(customerRepository.findPhoneByMobile("9876543210")).thenReturn(Optional.of(phone));

        CustomerDto.CustomerResponse res = customerService.lookupByMobile("9876543210");

        assertNotNull(res);
        assertEquals(customerId, res.id());
        assertEquals("Alice Smith", res.fullName());
        assertEquals("9876543210", res.mobile());
    }

    @Test
    void lookupByMobile_notFound_throwsResourceNotFoundException() {
        when(customerRepository.findPhoneByMobile("9999999999")).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> customerService.lookupByMobile("9999999999"));
    }

    @Test
    void lookupByMobile_blank_throwsBadRequestException() {
        assertThrows(BadRequestException.class, () -> customerService.lookupByMobile("   "));
    }

    @Test
    void getRepairHistory_returnsListOfTickets() {
        Customer customer = new Customer();
        customer.setId(customerId);
        customer.setFullName("Alice Smith");
        customer.setCustomerCode("CUST-1001");
        customer.setCreatedAt(Instant.now());

        RepairTicket t1 = new RepairTicket();
        t1.setId(UUID.randomUUID());
        t1.setCustomer(customer);
        t1.setTrackingNumber("TRK-1001");
        t1.setDeviceType(DeviceType.MOBILE);
        t1.setBrand("Apple");
        t1.setModel("iPhone 13");
        t1.setStatus(RepairStatus.DELIVERED);
        t1.setProblemDescription("Screen replaced");
        t1.setCreatedAt(Instant.now());

        when(customerRepository.findById(customerId)).thenReturn(Optional.of(customer));
        when(ticketRepository.findByCustomerIdWithDetailsOrderByCreatedAtDesc(customerId)).thenReturn(List.of(t1));

        List<TicketDto.TicketResponse> history = customerService.getRepairHistory(customerId);

        assertEquals(1, history.size());
        assertEquals("TRK-1001", history.get(0).trackingNumber());
        assertEquals("Apple", history.get(0).brand());
        assertEquals("iPhone 13", history.get(0).model());
    }
}
