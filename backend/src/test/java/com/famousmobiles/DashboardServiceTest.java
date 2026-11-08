package com.famousmobiles;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

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
        when(ticketRepository.countReceivedBetween(any(Instant.class), any(Instant.class), isNull())).thenReturn(1L);
        when(ticketRepository.countUnderRepair(isNull())).thenReturn(1L);
        when(ticketRepository.countDeliveredBetween(any(Instant.class), any(Instant.class), isNull())).thenReturn(0L);

        List<Object[]> statusCounts = new ArrayList<>();
        statusCounts.add(new Object[]{RepairStatus.DEVICE_RECEIVED, 1L});
        statusCounts.add(new Object[]{RepairStatus.WAITING_FOR_PARTS, 0L});
        statusCounts.add(new Object[]{RepairStatus.READY_FOR_PICKUP, 0L});
        when(ticketRepository.countGroupByStatus(isNull())).thenReturn(statusCounts);
        when(paymentRepository.sumPaymentsSince(any(Instant.class), isNull())).thenReturn(new BigDecimal("1500"));

        var metrics = dashboardService.getMetrics(true);

        assertEquals(1L, metrics.devicesReceivedToday());
        assertEquals(1L, metrics.devicesUnderRepair());
        assertEquals(0L, metrics.deliveredToday());
        assertEquals(new BigDecimal("1500"), metrics.revenueToday());
        assertEquals(new BigDecimal("1500"), metrics.revenueThisWeek());
        assertEquals(new BigDecimal("1500"), metrics.revenueThisMonth());
    }

    @Test
    void getMetrics_hidesRevenueFromStaff() {
        when(ticketRepository.countReceivedBetween(any(Instant.class), any(Instant.class), isNull())).thenReturn(0L);
        when(ticketRepository.countUnderRepair(isNull())).thenReturn(0L);
        when(ticketRepository.countDeliveredBetween(any(Instant.class), any(Instant.class), isNull())).thenReturn(0L);
        when(ticketRepository.countGroupByStatus(isNull())).thenReturn(new ArrayList<>());

        var metrics = dashboardService.getMetrics(false);

        assertNull(metrics.revenueToday());
        assertNull(metrics.revenueThisWeek());
        assertNull(metrics.revenueThisMonth());
    }

    @Test
    void getMetrics_deliveredTodayOnlyCountsDeliveredStatusToday() {
        when(ticketRepository.countReceivedBetween(any(Instant.class), any(Instant.class), isNull())).thenReturn(2L);
        when(ticketRepository.countUnderRepair(isNull())).thenReturn(0L);
        when(ticketRepository.countDeliveredBetween(any(Instant.class), any(Instant.class), isNull())).thenReturn(1L);

        List<Object[]> statusCounts = new ArrayList<>();
        statusCounts.add(new Object[]{RepairStatus.DELIVERED, 1L});
        when(ticketRepository.countGroupByStatus(isNull())).thenReturn(statusCounts);

        var metrics = dashboardService.getMetrics(false);

        assertEquals(1L, metrics.deliveredToday());
        assertEquals(2L, metrics.devicesReceivedToday());
    }
}
