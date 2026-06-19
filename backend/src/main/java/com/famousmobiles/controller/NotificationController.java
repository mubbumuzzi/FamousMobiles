package com.famousmobiles.controller;

import java.util.List;
import java.util.UUID;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.famousmobiles.domain.NotificationLog;
import com.famousmobiles.service.NotificationService;

@RestController
@RequestMapping("/api/tickets/{ticketId}/notifications")
@PreAuthorize("hasAnyRole('ADMIN', 'SALESMAN', 'TECHNICIAN')")
public class NotificationController {

    private final NotificationService notificationService;

    public NotificationController(NotificationService notificationService) {
        this.notificationService = notificationService;
    }

    @GetMapping
    public List<NotificationLog> list(@PathVariable UUID ticketId) {
        return notificationService.getByTicket(ticketId);
    }
}
