package com.famousmobiles;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.famousmobiles.domain.RepairTicket;
import com.famousmobiles.domain.enums.RepairStatus;
import com.famousmobiles.repository.PaymentRepository;
import com.famousmobiles.repository.RepairTicketRepository;
import com.famousmobiles.service.DashboardService;

@ExtendWith(MockitoExtension.class)
class DashboardServiceTest {

    @Mock private RepairTicketRepository ticketRepository;
    @Mock private PaymentRepository paymentRepository;

    @InjectMocks private DashboardService dashboardService;

    @Test
    void getMetrics_includesRevenueForAdmin() {
        RepairTicket ticket = new RepairTicket();
        ticket.setCreatedAt(Instant.now());
        ticket.setStatus(RepairStatus.DEVICE_RECEIVED);
        ticket.setEstimatedCost(BigDecimal.ZERO);
        ticket.setAdvancePaid(BigDecimal.ZERO);
        ticket.setBalanceAmount(BigDecimal.ZERO);

        PaymentView payment = new PaymentView(new BigDecimal("1500"), Instant.now());

        when(ticketRepository.findAll()).thenReturn(List.of(ticket));
        stubStatusCounts();
        when(paymentRepository.findAll()).thenReturn(List.of(payment));

        var metrics = dashboardService.getMetrics(true);

        assertEquals(new BigDecimal("1500"), metrics.revenueToday());
        assertEquals(new BigDecimal("1500"), metrics.revenueThisWeek());
        assertEquals(new BigDecimal("1500"), metrics.revenueThisMonth());
    }

    @Test
    void getMetrics_hidesRevenueFromStaff() {
        when(ticketRepository.findAll()).thenReturn(List.of());
        stubStatusCounts();

        var metrics = dashboardService.getMetrics(false);

        assertNull(metrics.revenueToday());
        assertNull(metrics.revenueThisWeek());
        assertNull(metrics.revenueThisMonth());
    }

    private void stubStatusCounts() {
        for (RepairStatus status : RepairStatus.values()) {
            when(ticketRepository.countByStatus(status)).thenReturn(0L);
        }
    }

    private static final class PaymentView extends com.famousmobiles.domain.Payment {
        private final BigDecimal amount;
        private final Instant createdAt;

        PaymentView(BigDecimal amount, Instant createdAt) {
            this.amount = amount;
            this.createdAt = createdAt;
        }

        @Override
        public BigDecimal getAmount() {
            return amount;
        }

        @Override
        public Instant getCreatedAt() {
            return createdAt;
        }
    }
}
