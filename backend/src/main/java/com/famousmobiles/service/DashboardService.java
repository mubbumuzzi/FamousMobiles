package com.famousmobiles.service;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.LinkedHashMap;
import java.util.Map;

import org.springframework.stereotype.Service;

import com.famousmobiles.domain.enums.RepairStatus;
import com.famousmobiles.dto.MiscDto;
import com.famousmobiles.repository.PaymentRepository;
import com.famousmobiles.repository.RepairTicketRepository;

@Service
public class DashboardService {

    private final RepairTicketRepository ticketRepository;
    private final PaymentRepository paymentRepository;

    public DashboardService(RepairTicketRepository ticketRepository, PaymentRepository paymentRepository) {
        this.ticketRepository = ticketRepository;
        this.paymentRepository = paymentRepository;
    }

    public MiscDto.DashboardMetrics getMetrics() {
        LocalDate today = LocalDate.now(ZoneOffset.UTC);
        Instant startOfDay = today.atStartOfDay().toInstant(ZoneOffset.UTC);
        Instant startOfWeek = today.minusDays(today.getDayOfWeek().getValue() - 1L).atStartOfDay().toInstant(ZoneOffset.UTC);
        Instant startOfMonth = today.withDayOfMonth(1).atStartOfDay().toInstant(ZoneOffset.UTC);

        long receivedToday = ticketRepository.findAll().stream()
                .filter(t -> !t.getCreatedAt().isBefore(startOfDay)).count();
        long underRepair = ticketRepository.findAll().stream()
                .filter(t -> t.getStatus() != RepairStatus.DELIVERED && t.getStatus() != RepairStatus.READY_FOR_PICKUP)
                .filter(t -> t.getStatus().ordinal() >= RepairStatus.REPAIR_IN_PROGRESS.ordinal()).count();
        long waitingParts = ticketRepository.countByStatus(RepairStatus.WAITING_FOR_PARTS);
        long readyPickup = ticketRepository.countByStatus(RepairStatus.READY_FOR_PICKUP);
        long deliveredToday = ticketRepository.findAll().stream()
                .filter(t -> t.getDeliveredAt() != null && !t.getDeliveredAt().isBefore(startOfDay)).count();

        BigDecimal revenueToday = sumPaymentsSince(startOfDay);
        BigDecimal revenueWeek = sumPaymentsSince(startOfWeek);
        BigDecimal revenueMonth = sumPaymentsSince(startOfMonth);

        Map<String, Long> breakdown = new LinkedHashMap<>();
        for (RepairStatus status : RepairStatus.values()) {
            breakdown.put(status.name(), ticketRepository.countByStatus(status));
        }

        return new MiscDto.DashboardMetrics(
                receivedToday, underRepair, waitingParts, readyPickup, deliveredToday,
                revenueToday, revenueWeek, revenueMonth, breakdown
        );
    }

    private BigDecimal sumPaymentsSince(Instant since) {
        return paymentRepository.findAll().stream()
                .filter(p -> !p.getCreatedAt().isBefore(since))
                .map(p -> p.getAmount())
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }
}
