package com.famousmobiles.controller;

import java.util.List;

import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.famousmobiles.domain.RepairTicket;
import com.famousmobiles.dto.TicketDto;
import com.famousmobiles.exception.ResourceNotFoundException;
import com.famousmobiles.repository.RepairTicketRepository;
import com.famousmobiles.service.PdfReceiptService;
import com.famousmobiles.service.PublicTrackingService;

@RestController
@RequestMapping("/api/public/track")
public class PublicTrackingController {

    private final PublicTrackingService publicTrackingService;
    private final RepairTicketRepository ticketRepository;
    private final PdfReceiptService pdfReceiptService;

    public PublicTrackingController(
            PublicTrackingService publicTrackingService,
            RepairTicketRepository ticketRepository,
            PdfReceiptService pdfReceiptService) {
        this.publicTrackingService = publicTrackingService;
        this.ticketRepository = ticketRepository;
        this.pdfReceiptService = pdfReceiptService;
    }

    @GetMapping("/{trackingNumber}")
    public TicketDto.PublicTrackingResponse track(@PathVariable String trackingNumber) {
        return publicTrackingService.trackByNumber(trackingNumber);
    }

    @Transactional(readOnly = true)
    @GetMapping("/{trackingNumber}/receipt/pdf")
    public ResponseEntity<byte[]> receiptPdf(@PathVariable String trackingNumber) throws Exception {
        RepairTicket ticket = ticketRepository.findByTrackingNumberWithDetails(trackingNumber)
                .orElseThrow(() -> new ResourceNotFoundException("Tracking number not found"));
        byte[] pdf = pdfReceiptService.generateReceipt(ticket);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + ticket.getTrackingNumber() + "-receipt.pdf\"")
                .contentType(MediaType.APPLICATION_PDF)
                .body(pdf);
    }

    @GetMapping
    public List<TicketDto.PublicTrackingResponse> trackByMobile(@RequestParam String mobile) {
        return publicTrackingService.trackByMobile(mobile);
    }
}
