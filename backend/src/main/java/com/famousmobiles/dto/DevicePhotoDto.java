package com.famousmobiles.dto;

import java.time.Instant;
import java.util.UUID;

import com.famousmobiles.domain.enums.PhotoType;

public record DevicePhotoDto(
        UUID id,
        UUID ticketId,
        PhotoType photoType,
        String fileName,
        String fileUrl,
        String contentType,
        long fileSize,
        String uploadedByName,
        Instant createdAt
) {}
