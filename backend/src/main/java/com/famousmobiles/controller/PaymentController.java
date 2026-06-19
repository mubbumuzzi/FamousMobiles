package com.famousmobiles.controller;

import java.util.List;
import java.util.UUID;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.famousmobiles.dto.PaymentDto;
import com.famousmobiles.dto.TicketDto;
import com.famousmobiles.service.PaymentService;

@RestController
@RequestMapping("/api")
public class PaymentController {

    private final PaymentService paymentService;

    public PaymentController(PaymentService paymentService) {
        this.paymentService = paymentService;
    }

    @PostMapping("/tickets/{id}/payments")
    @PreAuthorize("hasAnyRole('ADMIN', 'RECEPTION')")
    public PaymentDto.PaymentResponse record(@PathVariable UUID id, @RequestBody PaymentDto.PaymentRequest request) {
        return paymentService.recordPayment(id, request);
    }

    @GetMapping("/tickets/{id}/payments")
    @PreAuthorize("hasAnyRole('ADMIN', 'RECEPTION', 'TECHNICIAN')")
    public List<PaymentDto.PaymentResponse> list(@PathVariable UUID id) {
        return paymentService.getByTicket(id);
    }

    @GetMapping("/payments/outstanding")
    @PreAuthorize("hasAnyRole('ADMIN', 'RECEPTION')")
    public List<TicketDto.TicketResponse> outstanding() {
        return paymentService.getOutstanding();
    }
}
