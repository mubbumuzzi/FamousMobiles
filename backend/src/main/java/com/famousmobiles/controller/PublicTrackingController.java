package com.famousmobiles.controller;

import java.util.List;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.famousmobiles.dto.TicketDto;
import com.famousmobiles.service.PublicTrackingService;

@RestController
@RequestMapping("/api/public/track")
public class PublicTrackingController {

    private final PublicTrackingService publicTrackingService;

    public PublicTrackingController(PublicTrackingService publicTrackingService) {
        this.publicTrackingService = publicTrackingService;
    }

    @GetMapping("/{trackingNumber}")
    public TicketDto.PublicTrackingResponse track(@PathVariable String trackingNumber) {
        return publicTrackingService.trackByNumber(trackingNumber);
    }

    @GetMapping
    public List<TicketDto.PublicTrackingResponse> trackByMobile(@RequestParam String mobile) {
        return publicTrackingService.trackByMobile(mobile);
    }
}
