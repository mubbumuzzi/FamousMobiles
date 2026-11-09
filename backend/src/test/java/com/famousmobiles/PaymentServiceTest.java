package com.famousmobiles;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.famousmobiles.domain.AccessorySale;
import com.famousmobiles.domain.Customer;
import com.famousmobiles.domain.Payment;
import com.famousmobiles.domain.RepairTicket;
import com.famousmobiles.domain.Store;
import com.famousmobiles.domain.TicketStatusHistory;
import com.famousmobiles.domain.User;
import com.famousmobiles.domain.enums.PaymentMode;
import com.famousmobiles.domain.enums.RepairStatus;
import com.famousmobiles.domain.enums.UserRole;
import com.famousmobiles.dto.PaymentDto;
import com.famousmobiles.exception.BadRequestException;
import com.famousmobiles.exception.ForbiddenException;
import com.famousmobiles.repository.AccessorySaleRepository;
import com.famousmobiles.repository.PaymentRepository;
import com.famousmobiles.repository.RepairTicketRepository;
import com.famousmobiles.repository.TicketStatusHistoryRepository;
import com.famousmobiles.security.SecurityUtils;
import com.famousmobiles.service.PaymentService;
import com.famousmobiles.service.TicketService;

@ExtendWith(MockitoExtension.class)
class PaymentServiceTest {

    @Mock
    private PaymentRepository paymentRepository;

    @Mock
    private AccessorySaleRepository accessorySaleRepository;

    @Mock
    private TicketService ticketService;

    @Mock
    private RepairTicketRepository ticketRepository;

    @Mock
    private TicketStatusHistoryRepository historyRepository;

    @Mock
    private SecurityUtils securityUtils;

    @InjectMocks
    private PaymentService paymentService;

    private User staffUser;
    private Store store;
    private RepairTicket ticket;

    @BeforeEach
    void setUp() {
        staffUser = new User();
        staffUser.setId(UUID.randomUUID());
        staffUser.setFullName("Staff Member");
        staffUser.setRole(UserRole.SALESMAN);

        store = new Store();
        store.setId(UUID.randomUUID());
        store.setCode("FM1");

        Customer customer = new Customer();
        customer.setId(UUID.randomUUID());
        customer.setFullName("Customer Name");
        customer.setMobile("9063786751");

        ticket = new RepairTicket();
        ticket.setId(UUID.randomUUID());
        ticket.setTrackingNumber("FM1-2026-000001");
        ticket.setCustomer(customer);
        ticket.setStore(store);
        ticket.setStatus(RepairStatus.REPAIR_IN_PROGRESS);
        ticket.setEstimatedCost(new BigDecimal("1500.00"));
        ticket.setAdvancePaid(new BigDecimal("500.00"));
        ticket.setBalanceAmount(new BigDecimal("1000.00"));
    }

    @Test
    void recordPayment_validAmount_updatesBalanceAndAdvancePaid() {
        UUID ticketId = ticket.getId();
        when(securityUtils.getCurrentUser()).thenReturn(staffUser);
        when(ticketService.getEntity(ticketId)).thenReturn(ticket);
        when(paymentRepository.save(any(Payment.class))).thenAnswer(inv -> {
            Payment p = inv.getArgument(0);
            p.setId(UUID.randomUUID());
            p.setCreatedAt(Instant.now());
            return p;
        });

        PaymentDto.PaymentRequest req = new PaymentDto.PaymentRequest(
                new BigDecimal("600.00"),
                PaymentMode.UPI,
                "Partial payment by Google Pay"
        );

        PaymentDto.PaymentResponse resp = paymentService.recordPayment(ticketId, req);

        assertNotNull(resp);
        assertEquals(new BigDecimal("600.00"), resp.amount());
        assertEquals(PaymentMode.UPI, resp.paymentMode());
        assertEquals("Partial payment by Google Pay", resp.notes());

        // Advance paid updated: 500 + 600 = 1100
        assertEquals(new BigDecimal("1100.00"), ticket.getAdvancePaid());
        // Balance amount updated: 1500 - 1100 = 400
        assertEquals(new BigDecimal("400.00"), ticket.getBalanceAmount());

        verify(ticketRepository).save(ticket);
        verify(historyRepository).save(any(TicketStatusHistory.class));
    }

    @Test
    void recordPayment_amountExceedingBalance_throwsBadRequestException() {
        UUID ticketId = ticket.getId();
        when(securityUtils.getCurrentUser()).thenReturn(staffUser);
        when(ticketService.getEntity(ticketId)).thenReturn(ticket);

        // Balance is 1000, attempt to pay 1200
        PaymentDto.PaymentRequest req = new PaymentDto.PaymentRequest(
                new BigDecimal("1200.00"),
                PaymentMode.CASH,
                null
        );

        BadRequestException ex = assertThrows(BadRequestException.class, () ->
                paymentService.recordPayment(ticketId, req)
        );
        assertEquals("Payment amount (₹1200.00) cannot exceed remaining balance of ₹1000.00", ex.getMessage());
    }

    @Test
    void recordPayment_zeroOrNegativeAmount_throwsBadRequestException() {
        UUID ticketId = ticket.getId();
        when(securityUtils.getCurrentUser()).thenReturn(staffUser);
        when(ticketService.getEntity(ticketId)).thenReturn(ticket);

        PaymentDto.PaymentRequest zeroReq = new PaymentDto.PaymentRequest(
                BigDecimal.ZERO,
                PaymentMode.CASH,
                null
        );

        assertThrows(BadRequestException.class, () -> paymentService.recordPayment(ticketId, zeroReq));

        PaymentDto.PaymentRequest negReq = new PaymentDto.PaymentRequest(
                new BigDecimal("-50.00"),
                PaymentMode.CASH,
                null
        );

        assertThrows(BadRequestException.class, () -> paymentService.recordPayment(ticketId, negReq));
    }

    @Test
    void getTodayRevenueSummary_nonAdmin_throwsForbiddenException() {
        when(securityUtils.isAdmin()).thenReturn(false);

        assertThrows(ForbiddenException.class, () ->
                paymentService.getTodayRevenueSummary(null)
        );
    }

    @Test
    void getTodayRevenueSummary_combinesRepairsAndAccessorySalesByPaymentMode() {
        when(securityUtils.isAdmin()).thenReturn(true);

        // Mock Repair Payment (Cash)
        Payment paymentCash = new Payment();
        paymentCash.setId(UUID.randomUUID());
        paymentCash.setTicket(ticket);
        paymentCash.setStore(store);
        paymentCash.setAmount(new BigDecimal("500.00"));
        paymentCash.setPaymentMode(PaymentMode.CASH);
        paymentCash.setRecordedBy(staffUser);
        paymentCash.setCreatedAt(Instant.now());

        when(paymentRepository.findPaymentsSinceWithDetails(any(Instant.class)))
                .thenReturn(List.of(paymentCash));

        // Mock Accessory Sale (UPI)
        AccessorySale saleUpi = new AccessorySale();
        saleUpi.setId(UUID.randomUUID());
        saleUpi.setBillNumber("FM-ACC-2026-00001");
        saleUpi.setAccessoryName("UV Curved Glass");
        saleUpi.setPrice(new BigDecimal("100.00"));
        saleUpi.setPaymentMode("UPI");
        saleUpi.setStatus("COMPLETED");
        saleUpi.setStore(store);
        saleUpi.setCustomerName("Mubasheer");
        saleUpi.setCustomerMobile("9063786751");

        // Mock Cancelled Sale (MUST BE IGNORED from totals)
        AccessorySale saleCancelled = new AccessorySale();
        saleCancelled.setId(UUID.randomUUID());
        saleCancelled.setBillNumber("FM-ACC-2026-00002");
        saleCancelled.setPrice(new BigDecimal("250.00"));
        saleCancelled.setPaymentMode("CASH");
        saleCancelled.setStatus("CANCELLED");
        saleCancelled.setStore(store);

        when(accessorySaleRepository.findSalesSinceWithDetails(any(Instant.class)))
                .thenReturn(List.of(saleUpi, saleCancelled));

        PaymentDto.TodayRevenueSummary summary = paymentService.getTodayRevenueSummary(store.getId());

        assertNotNull(summary);
        // Total: 500 repair + 100 sales = 600
        assertEquals(new BigDecimal("600.00"), summary.totalRevenue());
        assertEquals(new BigDecimal("500.00"), summary.repairRevenue());
        assertEquals(new BigDecimal("100.00"), summary.salesRevenue());

        // Breakdown: Cash = 500, UPI = 100, Card = 0
        assertEquals(new BigDecimal("500.00"), summary.cashTotal());
        assertEquals(new BigDecimal("100.00"), summary.upiTotal());
        assertEquals(BigDecimal.ZERO, summary.cardTotal());

        assertEquals(1, summary.repairCount());
        assertEquals(1, summary.salesCount());
        assertEquals(2, summary.transactionCount());
    }
}
