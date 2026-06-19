package com.famousmobiles.controller;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import com.famousmobiles.domain.DevicePhoto;
import com.famousmobiles.domain.enums.PhotoType;
import com.famousmobiles.dto.TicketDto;
import com.famousmobiles.service.PdfReceiptService;
import com.famousmobiles.service.TicketService;

@RestController
@RequestMapping("/api/tickets")
@PreAuthorize("hasAnyRole('ADMIN', 'RECEPTION', 'TECHNICIAN')")
public class TicketController {

    private final TicketService ticketService;
    private final PdfReceiptService pdfReceiptService;

    public TicketController(TicketService ticketService, PdfReceiptService pdfReceiptService) {
        this.ticketService = ticketService;
        this.pdfReceiptService = pdfReceiptService;
    }

    @GetMapping
    public List<TicketDto.TicketResponse> list() {
        return ticketService.list();
    }

    @GetMapping("/{id}")
    public TicketDto.TicketResponse get(@PathVariable UUID id) {
        return ticketService.get(id);
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'RECEPTION')")
    public TicketDto.TicketResponse create(@RequestBody TicketDto.CreateTicketRequest request) {
        return ticketService.create(request);
    }

    @PutMapping("/{id}")
    public TicketDto.TicketResponse update(@PathVariable UUID id, @RequestBody TicketDto.UpdateTicketRequest request) {
        return ticketService.update(id, request);
    }

    @PatchMapping("/{id}/status")
    public TicketDto.TicketResponse updateStatus(@PathVariable UUID id, @RequestBody TicketDto.StatusUpdateRequest request) {
        return ticketService.updateStatus(id, request);
    }

    @PostMapping("/{id}/assign")
    @PreAuthorize("hasRole('ADMIN')")
    public TicketDto.TicketResponse assign(@PathVariable UUID id, @RequestBody TicketDto.AssignTechnicianRequest request) {
        return ticketService.assignTechnician(id, request);
    }

    @PostMapping("/{id}/notes")
    public TicketDto.TimelineEntry addNote(@PathVariable UUID id, @RequestBody Map<String, String> body) {
        return ticketService.addNote(id, body.get("content"));
    }

    @GetMapping("/{id}/timeline")
    public List<TicketDto.TimelineEntry> timeline(@PathVariable UUID id) {
        return ticketService.getTimeline(id);
    }

    @PostMapping("/{id}/photos")
    public DevicePhoto uploadPhoto(@PathVariable UUID id,
            @RequestParam PhotoType photoType,
            @RequestParam("file") MultipartFile file) {
        return ticketService.uploadPhoto(id, photoType, file);
    }

    @GetMapping("/{id}/photos")
    public List<DevicePhoto> photos(@PathVariable UUID id) {
        return ticketService.getPhotos(id);
    }

    @GetMapping("/{id}/receipt/pdf")
    @PreAuthorize("hasAnyRole('ADMIN', 'RECEPTION')")
    public ResponseEntity<byte[]> receipt(@PathVariable UUID id) throws Exception {
        var ticket = ticketService.getEntity(id);
        byte[] pdf = pdfReceiptService.generateReceipt(ticket);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=" + ticket.getTrackingNumber() + ".pdf")
                .contentType(MediaType.APPLICATION_PDF)
                .body(pdf);
    }
}
