package com.famousmobiles.service;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.Set;
import java.util.UUID;

import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import com.famousmobiles.config.AppProperties;
import com.famousmobiles.exception.BadRequestException;

@Service
public class FileStorageService {

    private static final Set<String> ALLOWED_TYPES = Set.of(
        "image/jpeg",
        "image/jpg",
        "image/pjpeg",
        "image/png",
        "image/x-png",
        "image/webp",
        "image/heic",
        "image/heif"
    );
    private static final long MAX_SIZE = 25 * 1024 * 1024;

    private final Path uploadRoot;

    public FileStorageService(AppProperties appProperties) throws IOException {
        this.uploadRoot = Paths.get(appProperties.uploadDir()).toAbsolutePath().normalize();
        Files.createDirectories(uploadRoot);
        Files.createDirectories(uploadRoot.resolve("receipts"));
    }

    public StoredFile storeTicketPhoto(UUID ticketId, String category, MultipartFile file) {
        validate(file);
        String fileName = UUID.randomUUID() + "_" + sanitize(file.getOriginalFilename());
        Path targetDir = uploadRoot.resolve("tickets").resolve(ticketId.toString()).resolve(category);
        try {
            Files.createDirectories(targetDir);
            Path target = targetDir.resolve(fileName);
            try (InputStream in = file.getInputStream()) {
                Files.copy(in, target, StandardCopyOption.REPLACE_EXISTING);
            }
            return new StoredFile(fileName, target.toString(), file.getContentType(), file.getSize());
        } catch (IOException e) {
            throw new BadRequestException("Failed to store file: " + e.getMessage());
        }
    }

    public Path getReceiptPath(String trackingNumber) {
        return uploadRoot.resolve("receipts").resolve(trackingNumber + ".pdf");
    }

    public Resource loadAsResource(String filePath) throws IOException {
        Path path = Paths.get(filePath).normalize();
        if (!path.startsWith(uploadRoot)) {
            throw new BadRequestException("Invalid file path");
        }
        Resource resource = new UrlResource(path.toUri());
        if (!resource.exists()) {
            throw new BadRequestException("File not found");
        }
        return resource;
    }

    private void validate(MultipartFile file) {
        if (file.isEmpty()) {
            throw new BadRequestException("File is empty");
        }
        if (file.getSize() > MAX_SIZE) {
            throw new BadRequestException("File exceeds 25MB limit");
        }
        String contentType = file.getContentType();
        boolean allowed = contentType != null && ALLOWED_TYPES.contains(contentType.toLowerCase());
        if (!allowed) {
            // Also inspect filename extension fallback for phones/browsers sending application/octet-stream
            String original = file.getOriginalFilename();
            if (original != null) {
                String lower = original.toLowerCase();
                if (lower.endsWith(".jpg") || lower.endsWith(".jpeg") || lower.endsWith(".png") ||
                    lower.endsWith(".webp") || lower.endsWith(".heic") || lower.endsWith(".heif")) {
                    allowed = true;
                }
            }
        }
        if (!allowed) {
            throw new BadRequestException("Only JPEG, PNG, WebP, and HEIC images are allowed");
        }
    }

    private String sanitize(String name) {
        if (name == null) {
            return "upload";
        }
        return name.replaceAll("[^a-zA-Z0-9._-]", "_");
    }

    public record StoredFile(String fileName, String filePath, String contentType, long fileSize) {}
}
