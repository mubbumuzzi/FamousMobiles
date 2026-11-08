package com.famousmobiles;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertThrows;

import java.io.IOException;
import java.nio.file.Path;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.mock.web.MockMultipartFile;

import com.famousmobiles.config.AppProperties;
import com.famousmobiles.exception.BadRequestException;
import com.famousmobiles.service.FileStorageService;

public class FileStorageServiceTest {

    @TempDir
    Path tempDir;

    private FileStorageService fileStorageService;

    @BeforeEach
    void setUp() throws IOException {
        AppProperties appProperties = new AppProperties(
                new AppProperties.Jwt("secret-key-1234567890-min-32-chars-long", "refresh-secret-1234567890-min-32-chars", 900000L, 604800000L),
                tempDir.toString(),
                "http://localhost",
                new AppProperties.Admin("admin@famous.com", "Admin@123", "9000000000", false),
                new AppProperties.Cors("http://localhost"),
                new AppProperties.Shop("Famous Mobiles", "Basheer", "9063786751", java.util.List.of(), java.util.List.of())
        );
        fileStorageService = new FileStorageService(appProperties);
    }

    @Test
    void testAcceptsStandardAndModernPhoneFormats() {
        UUID ticketId = UUID.randomUUID();

        // Standard JPEG
        MockMultipartFile jpg = new MockMultipartFile("file", "photo.jpg", "image/jpeg", "fake-img".getBytes());
        assertDoesNotThrow(() -> fileStorageService.storeTicketPhoto(ticketId, "device", jpg));

        // image/jpg MIME (some Android devices)
        MockMultipartFile imageJpg = new MockMultipartFile("file", "photo.jpg", "image/jpg", "fake-img".getBytes());
        assertDoesNotThrow(() -> fileStorageService.storeTicketPhoto(ticketId, "device", imageJpg));

        // HEIC photo from iPhone
        MockMultipartFile heic = new MockMultipartFile("file", "photo.heic", "image/heic", "fake-img".getBytes());
        assertDoesNotThrow(() -> fileStorageService.storeTicketPhoto(ticketId, "device", heic));

        // application/octet-stream with .jpg extension (common WebView file chooser fallback)
        MockMultipartFile octetStream = new MockMultipartFile("file", "camera_capture.jpg", "application/octet-stream", "fake-img".getBytes());
        assertDoesNotThrow(() -> fileStorageService.storeTicketPhoto(ticketId, "device", octetStream));
    }

    @Test
    void testRejectsNonImageFiles() {
        UUID ticketId = UUID.randomUUID();
        MockMultipartFile pdf = new MockMultipartFile("file", "document.pdf", "application/pdf", "fake-pdf".getBytes());
        assertThrows(BadRequestException.class, () -> fileStorageService.storeTicketPhoto(ticketId, "device", pdf));
    }
}
