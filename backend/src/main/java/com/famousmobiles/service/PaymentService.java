package com.famousmobiles.service;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.famousmobiles.domain.Payment;
import com.famousmobiles.domain.RepairTicket;
import com.famousmobiles.domain.enums.UserRole;
import com.famousmobiles.dto.PaymentDto;
import com.famousmobiles.dto.TicketDto;
import com.famousmobiles.exception.ForbiddenException;
import com.famousmobiles.repository.PaymentRepository;
import com.famousmobiles.repository.RepairTicketRepository;
import com.famousmobiles.security.SecurityUtils;

@Service
public class PaymentService {

    private final PaymentRepository paymentRepository;
    private final TicketService ticketService;
    private final RepairTicketRepository ticketRepository;
    private final SecurityUtils securityUtils;

    public PaymentService(PaymentRepository paymentRepository, TicketService ticketService,
            RepairTicketRepository ticketRepository, SecurityUtils securityUtils) {
        this.paymentRepository = paymentRepository;
        this.ticketService = ticketService;
        this.ticketRepository = ticketRepository;
        this.securityUtils = securityUtils;
    }

    @Transactional
    public PaymentDto.PaymentResponse recordPayment(UUID ticketId, PaymentDto.PaymentRequest request) {
        var user = securityUtils.getCurrentUser();
        if (user.getRole() == UserRole.TECHNICIAN) {
            throw new ForbiddenException("Technicians cannot record payments");
        }
        RepairTicket ticket = ticketService.getEntity(ticketId);
        Payment payment = new Payment();
        payment.setTicket(ticket);
        payment.setAmount(request.amount());
        payment.setPaymentMode(request.paymentMode());
        payment.setNotes(request.notes());
        payment.setRecordedBy(user);
        paymentRepository.save(payment);

        BigDecimal totalPaid = ticket.getAdvancePaid().add(request.amount());
        ticket.setAdvancePaid(totalPaid);
        ticket.setBalanceAmount(ticket.getEstimatedCost().subtract(totalPaid));
        ticketRepository.save(ticket);
        return PaymentDto.PaymentResponse.from(payment);
    }

    public List<PaymentDto.PaymentResponse> getByTicket(UUID ticketId) {
        return paymentRepository.findByTicketIdOrderByCreatedAtAsc(ticketId).stream()
                .map(PaymentDto.PaymentResponse::from).toList();
    }

    public List<TicketDto.TicketResponse> getOutstanding() {
        return ticketRepository.findAll().stream()
                .filter(t -> t.getBalanceAmount().compareTo(BigDecimal.ZERO) > 0)
                .map(TicketDto.TicketResponse::from).toList();
    }
}
