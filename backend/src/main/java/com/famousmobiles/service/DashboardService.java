package com.famousmobiles.service;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.famousmobiles.domain.enums.RepairStatus;
import com.famousmobiles.dto.MiscDto;
import com.famousmobiles.repository.AccessorySaleRepository;
import com.famousmobiles.repository.PaymentRepository;
import com.famousmobiles.repository.RepairTicketRepository;

@Service
public class DashboardService {

    public static final ZoneId SHOP_ZONE = ZoneId.of("Asia/Kolkata");

    private final RepairTicketRepository ticketRepository;
    private final PaymentRepository paymentRepository;
    private final AccessorySaleRepository accessorySaleRepository;

    public DashboardService(
            RepairTicketRepository ticketRepository,
            PaymentRepository paymentRepository,
            AccessorySaleRepository accessorySaleRepository) {
        this.ticketRepository = ticketRepository;
        this.paymentRepository = paymentRepository;
        this.accessorySaleRepository = accessorySaleRepository;
    }

    @Transactional(readOnly = true)
    public MiscDto.DashboardMetrics getMetrics(boolean includeRevenue) {
        return getMetrics(includeRevenue, null);
    }

    @Transactional(readOnly = true)
    public MiscDto.DashboardMetrics getMetrics(boolean includeRevenue, UUID storeId) {
        LocalDate today = LocalDate.now(SHOP_ZONE);
        Instant startOfDay = today.atStartOfDay(SHOP_ZONE).toInstant();
        Instant endOfDay = today.plusDays(1).atStartOfDay(SHOP_ZONE).toInstant();
        Instant startOfWeek = today.minusDays(today.getDayOfWeek().getValue() - 1L).atStartOfDay(SHOP_ZONE).toInstant();
        Instant startOfMonth = today.withDayOfMonth(1).atStartOfDay(SHOP_ZONE).toInstant();

        long receivedToday = ticketRepository.countReceivedBetween(startOfDay, endOfDay, storeId);
        long underRepair = ticketRepository.countUnderRepair(storeId);
        long deliveredToday = ticketRepository.countDeliveredBetween(startOfDay, endOfDay, storeId);

        Map<String, Long> breakdown = new LinkedHashMap<>();
        for (RepairStatus status : RepairStatus.values()) {
            breakdown.put(status.name(), 0L);
        }
        List<Object[]> statusCounts = ticketRepository.countGroupByStatus(storeId);
        if (statusCounts != null) {
            for (Object[] row : statusCounts) {
                RepairStatus status = (RepairStatus) row[0];
                Long count = ((Number) row[1]).longValue();
                if (status != null) {
                    breakdown.put(status.name(), count);
                }
            }
        }

        long waitingParts = breakdown.getOrDefault(RepairStatus.WAITING_FOR_PARTS.name(), 0L);
        long readyPickup = breakdown.getOrDefault(RepairStatus.READY_FOR_PICKUP.name(), 0L)
                + breakdown.getOrDefault(RepairStatus.NOT_REPAIRABLE_READY_FOR_PICKUP.name(), 0L);

        BigDecimal repairRevenueToday = includeRevenue ? sumPaymentsSince(startOfDay, storeId) : null;
        BigDecimal salesRevenueToday = includeRevenue ? sumSalesSince(startOfDay, storeId) : null;
        BigDecimal revenueToday = includeRevenue ? repairRevenueToday.add(salesRevenueToday) : null;

        BigDecimal repairRevenueWeek = includeRevenue ? sumPaymentsSince(startOfWeek, storeId) : null;
        BigDecimal salesRevenueWeek = includeRevenue ? sumSalesSince(startOfWeek, storeId) : null;
        BigDecimal revenueWeek = includeRevenue ? repairRevenueWeek.add(salesRevenueWeek) : null;

        BigDecimal repairRevenueMonth = includeRevenue ? sumPaymentsSince(startOfMonth, storeId) : null;
        BigDecimal salesRevenueMonth = includeRevenue ? sumSalesSince(startOfMonth, storeId) : null;
        BigDecimal revenueMonth = includeRevenue ? repairRevenueMonth.add(salesRevenueMonth) : null;

        long salesCountToday = accessorySaleRepository.countSalesSince(startOfDay, storeId);

        return new MiscDto.DashboardMetrics(
                receivedToday, underRepair, waitingParts, readyPickup, deliveredToday,
                revenueToday, revenueWeek, revenueMonth, breakdown,
                repairRevenueToday, salesRevenueToday,
                repairRevenueMonth, salesRevenueMonth,
                salesCountToday
        );
    }

    private BigDecimal sumPaymentsSince(Instant since, UUID storeId) {
        BigDecimal sum = paymentRepository.sumPaymentsSince(since, storeId);
        return sum != null ? sum : BigDecimal.ZERO;
    }

    private BigDecimal sumSalesSince(Instant since, UUID storeId) {
        BigDecimal sum = accessorySaleRepository.sumSalesSince(since, storeId);
        return sum != null ? sum : BigDecimal.ZERO;
    }
}
