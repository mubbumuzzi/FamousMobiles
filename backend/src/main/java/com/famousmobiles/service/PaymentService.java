package com.famousmobiles.service;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.famousmobiles.domain.Payment;
import com.famousmobiles.domain.RepairTicket;
import com.famousmobiles.domain.TicketStatusHistory;
import com.famousmobiles.domain.enums.PaymentMode;
import com.famousmobiles.domain.enums.UserRole;
import com.famousmobiles.dto.PaymentDto;
import com.famousmobiles.dto.TicketDto;
import com.famousmobiles.exception.ForbiddenException;
import com.famousmobiles.repository.PaymentRepository;
import com.famousmobiles.repository.RepairTicketRepository;
import com.famousmobiles.repository.TicketStatusHistoryRepository;
import com.famousmobiles.security.SecurityUtils;

@Service
public class PaymentService {

    private final PaymentRepository paymentRepository;
    private final TicketService ticketService;
    private final RepairTicketRepository ticketRepository;
    private final TicketStatusHistoryRepository historyRepository;
    private final SecurityUtils securityUtils;

    public PaymentService(PaymentRepository paymentRepository, TicketService ticketService,
            RepairTicketRepository ticketRepository, TicketStatusHistoryRepository historyRepository,
            SecurityUtils securityUtils) {
        this.paymentRepository = paymentRepository;
        this.ticketService = ticketService;
        this.ticketRepository = ticketRepository;
        this.historyRepository = historyRepository;
        this.securityUtils = securityUtils;
    }

    @Transactional
    public PaymentDto.PaymentResponse recordPayment(UUID ticketId, PaymentDto.PaymentRequest request) {
        var user = securityUtils.getCurrentUser();
        RepairTicket ticket = ticketService.getEntity(ticketId);
        if (request.amount() == null || request.amount().signum() <= 0) {
            throw new com.famousmobiles.exception.BadRequestException("Payment amount must be greater than zero");
        }
        BigDecimal currentBalance = ticket.getBalanceAmount() != null ? ticket.getBalanceAmount() : BigDecimal.ZERO;
        if (request.amount().compareTo(currentBalance) > 0) {
            throw new com.famousmobiles.exception.BadRequestException(
                    "Payment amount (₹" + request.amount() + ") cannot exceed remaining balance of ₹" + currentBalance);
        }
        Payment payment = new Payment();
        payment.setTicket(ticket);
        payment.setAmount(request.amount());
        payment.setPaymentMode(request.paymentMode());
        payment.setNotes(request.notes());
        payment.setRecordedBy(user);
        payment = paymentRepository.save(payment);

        BigDecimal totalPaid = (ticket.getAdvancePaid() != null ? ticket.getAdvancePaid() : BigDecimal.ZERO).add(request.amount());
        ticket.setAdvancePaid(totalPaid);
        BigDecimal est = ticket.getEstimatedCost() != null ? ticket.getEstimatedCost() : BigDecimal.ZERO;
        ticket.setBalanceAmount(est.subtract(totalPaid).max(BigDecimal.ZERO));
        ticketRepository.save(ticket);

        TicketStatusHistory history = new TicketStatusHistory();
        history.setTicket(ticket);
        history.setFromStatus(ticket.getStatus());
        history.setToStatus(ticket.getStatus());
        history.setChangedBy(user);
        String paymentNote = "Payment of ₹" + request.amount() + " (" + request.paymentMode() + ") collected by " + user.getFullName() +
                " · Remaining balance: ₹" + ticket.getBalanceAmount();
        if (request.notes() != null && !request.notes().isBlank()) {
            paymentNote += " · Note: " + request.notes().trim();
        }
        history.setRemarks(paymentNote);
        historyRepository.save(history);

        return PaymentDto.PaymentResponse.from(payment);
    }

    @Transactional(readOnly = true)
    public List<PaymentDto.PaymentResponse> getByTicket(UUID ticketId) {
        return paymentRepository.findByTicketIdWithDetailsOrderByCreatedAtAsc(ticketId).stream()
                .map(PaymentDto.PaymentResponse::from).toList();
    }

    @Transactional(readOnly = true)
    public List<TicketDto.TicketResponse> getOutstanding() {
        return ticketRepository.findAllWithDetailsOrderByCreatedAtDesc().stream()
                .filter(t -> t.getBalanceAmount().compareTo(BigDecimal.ZERO) > 0)
                .map(TicketDto.TicketResponse::from).toList();
    }

    @Transactional(readOnly = true)
    public PaymentDto.TodayRevenueSummary getTodayRevenueSummary() {
        if (!securityUtils.isAdmin()) {
            throw new ForbiddenException("Only admin can view revenue details");
        }
        Instant startOfDay = LocalDate.now(ZoneId.of("Asia/Kolkata"))
                .atStartOfDay(ZoneId.of("Asia/Kolkata"))
                .toInstant();

        List<Payment> todayPayments = paymentRepository.findPaymentsSinceWithDetails(startOfDay);

        BigDecimal cashTotal = BigDecimal.ZERO;
        BigDecimal upiTotal = BigDecimal.ZERO;
        BigDecimal cardTotal = BigDecimal.ZERO;
        BigDecimal totalRevenue = BigDecimal.ZERO;

        List<PaymentDto.DetailedPaymentResponse> items = new ArrayList<>();
        for (Payment p : todayPayments) {
            BigDecimal amt = p.getAmount() != null ? p.getAmount() : BigDecimal.ZERO;
            totalRevenue = totalRevenue.add(amt);
            if (p.getPaymentMode() == PaymentMode.CASH) {
                cashTotal = cashTotal.add(amt);
            } else if (p.getPaymentMode() == PaymentMode.UPI) {
                upiTotal = upiTotal.add(amt);
            } else if (p.getPaymentMode() == PaymentMode.CARD) {
                cardTotal = cardTotal.add(amt);
            }
            items.add(PaymentDto.DetailedPaymentResponse.from(p));
        }

        return new PaymentDto.TodayRevenueSummary(
                totalRevenue,
                cashTotal,
                upiTotal,
                cardTotal,
                items.size(),
                items
        );
    }
}
