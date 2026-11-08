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

import com.famousmobiles.domain.Payment;
import com.famousmobiles.domain.RepairTicket;
import com.famousmobiles.domain.enums.RepairStatus;
import com.famousmobiles.dto.MiscDto;
import com.famousmobiles.repository.PaymentRepository;
import com.famousmobiles.repository.RepairTicketRepository;

@Service
public class DashboardService {

    public static final ZoneId SHOP_ZONE = ZoneId.of("Asia/Kolkata");

    private final RepairTicketRepository ticketRepository;
    private final PaymentRepository paymentRepository;

    public DashboardService(RepairTicketRepository ticketRepository, PaymentRepository paymentRepository) {
        this.ticketRepository = ticketRepository;
        this.paymentRepository = paymentRepository;
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

        List<RepairTicket> allTickets = ticketRepository.findAll();
        if (storeId != null) {
            allTickets = allTickets.stream()
                    .filter(t -> t.getStore() != null && storeId.equals(t.getStore().getId()))
                    .toList();
        }

        long receivedToday = allTickets.stream()
                .filter(t -> t.getCreatedAt() != null 
                          && !t.getCreatedAt().isBefore(startOfDay) 
                          && t.getCreatedAt().isBefore(endOfDay)).count();
        long underRepair = allTickets.stream()
                .filter(t -> t.getStatus() != RepairStatus.DELIVERED 
                          && t.getStatus() != RepairStatus.READY_FOR_PICKUP 
                          && t.getStatus() != RepairStatus.RETURNED_UNREPAIRED).count();
        long waitingParts = storeId != null
                ? allTickets.stream().filter(t -> t.getStatus() == RepairStatus.WAITING_FOR_PARTS).count()
                : ticketRepository.countByStatus(RepairStatus.WAITING_FOR_PARTS);
        long readyPickup = storeId != null
                ? allTickets.stream().filter(t -> t.getStatus() == RepairStatus.READY_FOR_PICKUP).count()
                : ticketRepository.countByStatus(RepairStatus.READY_FOR_PICKUP);
        long deliveredToday = allTickets.stream()
                .filter(t -> t.getStatus() == RepairStatus.DELIVERED 
                          && t.getDeliveredAt() != null 
                          && !t.getDeliveredAt().isBefore(startOfDay) 
                          && t.getDeliveredAt().isBefore(endOfDay)).count();

        BigDecimal revenueToday = includeRevenue ? sumPaymentsSince(startOfDay, storeId) : null;
        BigDecimal revenueWeek = includeRevenue ? sumPaymentsSince(startOfWeek, storeId) : null;
        BigDecimal revenueMonth = includeRevenue ? sumPaymentsSince(startOfMonth, storeId) : null;

        Map<String, Long> breakdown = new LinkedHashMap<>();
        for (RepairStatus status : RepairStatus.values()) {
            long count = storeId != null
                    ? allTickets.stream().filter(t -> t.getStatus() == status).count()
                    : ticketRepository.countByStatus(status);
            breakdown.put(status.name(), count);
        }

        return new MiscDto.DashboardMetrics(
                receivedToday, underRepair, waitingParts, readyPickup, deliveredToday,
                revenueToday, revenueWeek, revenueMonth, breakdown
        );
    }

    private BigDecimal sumPaymentsSince(Instant since, UUID storeId) {
        var stream = paymentRepository.findAll().stream()
                .filter(p -> !p.getCreatedAt().isBefore(since));
        if (storeId != null) {
            stream = stream.filter(p -> p.getStore() != null && storeId.equals(p.getStore().getId()));
        }
        return stream
                .map(Payment::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }
}
