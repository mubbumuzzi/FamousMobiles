package com.famousmobiles;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.Mockito.when;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.core.io.InputStreamResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;

import com.famousmobiles.controller.FileController;
import com.famousmobiles.domain.DevicePhoto;
import com.famousmobiles.service.FileStorageService;
import com.famousmobiles.service.TicketService;

@ExtendWith(MockitoExtension.class)
public class FileControllerTest {

    @Mock private TicketService ticketService;
    @Mock private FileStorageService fileStorageService;

    @InjectMocks
    private FileController fileController;

    @Test
    void testGetPhotoFile() throws IOException {
        UUID ticketId = UUID.randomUUID();
        UUID photoId = UUID.randomUUID();

        DevicePhoto photo = new DevicePhoto();
        photo.setId(photoId);
        photo.setFileName("phone_front.jpg");
        photo.setFilePath("/tmp/phone_front.jpg");
        photo.setContentType("image/jpeg");

        when(ticketService.getPhotoEntity(ticketId, photoId)).thenReturn(photo);

        Resource mockResource = new InputStreamResource(new ByteArrayInputStream("fake-jpeg".getBytes()));
        when(fileStorageService.loadAsResource("/tmp/phone_front.jpg")).thenReturn(mockResource);

        ResponseEntity<Resource> response = fileController.getPhotoFile(ticketId, photoId);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals(MediaType.IMAGE_JPEG, response.getHeaders().getContentType());
        assertNotNull(response.getBody());
    }
}
