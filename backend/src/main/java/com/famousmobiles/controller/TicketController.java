package com.famousmobiles.controller;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import com.famousmobiles.domain.enums.PhotoType;
import com.famousmobiles.dto.DevicePhotoDto;
import com.famousmobiles.dto.TicketDto;
import com.famousmobiles.service.PdfReceiptService;
import com.famousmobiles.service.TicketService;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/tickets")
public class TicketController {

    private final TicketService ticketService;
    private final PdfReceiptService pdfReceiptService;

    public TicketController(TicketService ticketService, PdfReceiptService pdfReceiptService) {
        this.ticketService = ticketService;
        this.pdfReceiptService = pdfReceiptService;
    }

    @GetMapping
    public List<TicketDto.TicketResponse> list(@RequestParam(required = false) UUID storeId) {
        return ticketService.list(storeId);
    }

    @GetMapping("/{id}")
    public TicketDto.TicketResponse get(@PathVariable UUID id) {
        return ticketService.get(id);
    }

    @PostMapping
    public TicketDto.TicketResponse create(@Valid @RequestBody TicketDto.CreateTicketRequest request) {
        return ticketService.create(request);
    }

    @PutMapping("/{id}")
    public TicketDto.TicketResponse update(@PathVariable UUID id, @Valid @RequestBody TicketDto.UpdateTicketRequest request) {
        return ticketService.update(id, request);
    }

    @PatchMapping("/{id}/status")
    public TicketDto.TicketResponse updateStatus(@PathVariable UUID id, @RequestBody TicketDto.StatusUpdateRequest request) {
        return ticketService.updateStatus(id, request);
    }

    @PostMapping("/{id}/reopen")
    public TicketDto.TicketResponse reopen(@PathVariable UUID id, @RequestBody TicketDto.ReopenTicketRequest request) {
        return ticketService.reopenTicket(id, request);
    }

    @PatchMapping("/{id}/estimation")
    public TicketDto.TicketResponse updateEstimation(@PathVariable UUID id, @RequestBody TicketDto.UpdateEstimationRequest request) {
        return ticketService.updateEstimation(id, request);
    }

    @PostMapping("/{id}/assign")
    @PreAuthorize("hasRole('ADMIN')")
    public TicketDto.TicketResponse assign(@PathVariable UUID id, @RequestBody TicketDto.AssignTechnicianRequest request) {
        return ticketService.assignTechnician(id, request);
    }

    @PostMapping("/{id}/assign-me")
    @PreAuthorize("hasRole('TECHNICIAN')")
    public TicketDto.TicketResponse assignSelf(@PathVariable UUID id) {
        return ticketService.assignSelf(id);
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
    public DevicePhotoDto uploadPhoto(@PathVariable UUID id,
            @RequestParam(required = false, defaultValue = "DEVICE") PhotoType photoType,
            @RequestParam("file") MultipartFile file) {
        return ticketService.uploadPhoto(id, photoType, file);
    }

    @GetMapping("/{id}/photos")
    public List<DevicePhotoDto> photos(@PathVariable UUID id) {
        return ticketService.getPhotos(id);
    }

    @DeleteMapping("/{id}/photos/{photoId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deletePhoto(@PathVariable UUID id, @PathVariable UUID photoId) {
        ticketService.deletePhoto(id, photoId);
    }

    @GetMapping("/{id}/receipt/pdf")
    public ResponseEntity<byte[]> receipt(
            @PathVariable UUID id,
            @RequestParam(required = false, defaultValue = "false") boolean duplicate,
            @RequestParam(required = false, defaultValue = "inline") String disposition) throws Exception {
        var ticket = ticketService.getEntityWithAccess(id);
        byte[] pdf = pdfReceiptService.generateReceipt(ticket, duplicate);
        String dispType = "attachment".equalsIgnoreCase(disposition) ? "attachment" : "inline";
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, dispType + "; filename=\"" + ticket.getTrackingNumber() + ".pdf\"")
                .contentType(MediaType.APPLICATION_PDF)
                .body(pdf);
    }
}
