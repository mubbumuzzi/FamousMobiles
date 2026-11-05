package com.famousmobiles.controller;

import java.io.IOException;
import java.util.UUID;
import java.util.concurrent.TimeUnit;

import org.springframework.core.io.Resource;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.famousmobiles.domain.DevicePhoto;
import com.famousmobiles.service.FileStorageService;
import com.famousmobiles.service.TicketService;

@RestController
@RequestMapping("/api/files")
public class FileController {

    private final TicketService ticketService;
    private final FileStorageService fileStorageService;

    public FileController(TicketService ticketService, FileStorageService fileStorageService) {
        this.ticketService = ticketService;
        this.fileStorageService = fileStorageService;
    }

    @GetMapping("/tickets/{ticketId}/photos/{photoId}")
    public ResponseEntity<Resource> getPhotoFile(@PathVariable UUID ticketId, @PathVariable UUID photoId) throws IOException {
        DevicePhoto photo = ticketService.getPhotoEntity(ticketId, photoId);
        Resource resource = fileStorageService.loadAsResource(photo.getFilePath());

        MediaType mediaType;
        try {
            mediaType = MediaType.parseMediaType(photo.getContentType());
        } catch (Exception e) {
            mediaType = MediaType.APPLICATION_OCTET_STREAM;
        }

        return ResponseEntity.ok()
                .contentType(mediaType)
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + photo.getFileName() + "\"")
                .cacheControl(CacheControl.maxAge(30, TimeUnit.DAYS).cachePublic())
                .body(resource);
    }
}
