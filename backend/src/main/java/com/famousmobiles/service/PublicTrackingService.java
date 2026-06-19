package com.famousmobiles.service;

import java.util.List;

import org.springframework.stereotype.Service;

import com.famousmobiles.domain.RepairTicket;
import com.famousmobiles.domain.enums.RepairStatus;
import com.famousmobiles.dto.TicketDto;
import com.famousmobiles.exception.ResourceNotFoundException;
import com.famousmobiles.repository.RepairTicketRepository;

@Service
public class PublicTrackingService {

    private final RepairTicketRepository ticketRepository;
    private final TicketService ticketService;

    public PublicTrackingService(RepairTicketRepository ticketRepository, TicketService ticketService) {
        this.ticketRepository = ticketRepository;
        this.ticketService = ticketService;
    }

    public TicketDto.PublicTrackingResponse trackByNumber(String trackingNumber) {
        RepairTicket ticket = ticketRepository.findByTrackingNumber(trackingNumber)
                .orElseThrow(() -> new ResourceNotFoundException("Tracking number not found"));
        return toPublicResponse(ticket);
    }

    public List<TicketDto.PublicTrackingResponse> trackByMobile(String mobile) {
        String normalized = mobile != null ? mobile.trim().replaceAll("\\s+", "") : "";
        List<RepairTicket> tickets = ticketRepository.findByCustomerMobile(normalized);
        if (tickets.isEmpty()) {
            throw new ResourceNotFoundException("No tickets found for this mobile number");
        }
        return tickets.stream().map(this::toPublicResponse).toList();
    }

    private TicketDto.PublicTrackingResponse toPublicResponse(RepairTicket ticket) {
        List<TicketDto.TimelineEntry> timeline = ticketService.getTimeline(ticket.getId()).stream()
                .filter(e -> "STATUS".equals(e.type()))
                .toList();
        return new TicketDto.PublicTrackingResponse(
                ticket.getTrackingNumber(),
                ticket.getBrand(),
                ticket.getModel(),
                ticket.getColor(),
                maskImei(ticket.getImei()),
                ticket.getStatus(),
                ticket.getEstimatedDeliveryDate() != null ? ticket.getEstimatedDeliveryDate().toString() : null,
                ticket.getEstimatedCost(),
                ticket.getAdvancePaid(),
                ticket.getBalanceAmount(),
                timeline,
                TicketService.allStatuses()
        );
    }

    private String maskImei(String imei) {
        if (imei == null || imei.length() < 4) {
            return "****";
        }
        return "****" + imei.substring(imei.length() - 4);
    }
}
