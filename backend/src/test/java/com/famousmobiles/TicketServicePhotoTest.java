package com.famousmobiles;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockMultipartFile;

import com.famousmobiles.domain.DevicePhoto;
import com.famousmobiles.domain.RepairTicket;
import com.famousmobiles.domain.User;
import com.famousmobiles.domain.enums.PhotoType;
import com.famousmobiles.domain.enums.RepairStatus;
import com.famousmobiles.domain.enums.UserRole;
import com.famousmobiles.dto.DevicePhotoDto;
import com.famousmobiles.repository.CustomerRepository;
import com.famousmobiles.repository.DevicePhotoRepository;
import com.famousmobiles.repository.PaymentRepository;
import com.famousmobiles.repository.RepairTicketRepository;
import com.famousmobiles.repository.TechnicianRepository;
import com.famousmobiles.repository.TicketNoteRepository;
import com.famousmobiles.repository.TicketStatusHistoryRepository;
import com.famousmobiles.security.SecurityUtils;
import com.famousmobiles.service.CustomerService;
import com.famousmobiles.service.FileStorageService;
import com.famousmobiles.service.NotificationService;
import com.famousmobiles.service.TicketService;
import com.famousmobiles.service.TrackingNumberService;

@ExtendWith(MockitoExtension.class)
public class TicketServicePhotoTest {

    @Mock private RepairTicketRepository ticketRepository;
    @Mock private TicketStatusHistoryRepository statusHistoryRepository;
    @Mock private TicketNoteRepository noteRepository;
    @Mock private TechnicianRepository technicianRepository;
    @Mock private CustomerRepository customerRepository;
    @Mock private DevicePhotoRepository photoRepository;
    @Mock private CustomerService customerService;
    @Mock private TrackingNumberService trackingNumberService;
    @Mock private NotificationService notificationService;
    @Mock private FileStorageService fileStorageService;
    @Mock private PaymentRepository paymentRepository;
    @Mock private SecurityUtils securityUtils;

    private TicketService ticketService;

    @BeforeEach
    void setUp() {
        ticketService = new TicketService(
                ticketRepository,
                statusHistoryRepository,
                noteRepository,
                photoRepository,
                customerService,
                technicianRepository,
                trackingNumberService,
                notificationService,
                fileStorageService,
                paymentRepository,
                securityUtils
        );
    }

    @Test
    void testUploadAndRetrieveDevicePhotos() {
        UUID ticketId = UUID.randomUUID();
        UUID photoId = UUID.randomUUID();

        RepairTicket ticket = new RepairTicket();
        ticket.setId(ticketId);
        ticket.setStatus(RepairStatus.DEVICE_RECEIVED);
        ticket.setBrand("Apple");
        ticket.setModel("iPhone 13");
        ticket.setColor("Blue");

        when(ticketRepository.findByIdWithDetails(ticketId)).thenReturn(Optional.of(ticket));

        User staff = new User();
        staff.setFullName("Staff Member");
        staff.setRole(UserRole.SALESMAN);
        when(securityUtils.getCurrentUser()).thenReturn(staff);

        MockMultipartFile file = new MockMultipartFile(
                "file", "iphone.jpg", "image/jpeg", "fake-image-bytes".getBytes()
        );

        when(fileStorageService.storeTicketPhoto(eq(ticketId), eq("device"), any()))
                .thenReturn(new FileStorageService.StoredFile("iphone_123.jpg", "/tmp/iphone_123.jpg", "image/jpeg", 16L));

        DevicePhoto savedPhoto = new DevicePhoto();
        savedPhoto.setId(photoId);
        savedPhoto.setTicket(ticket);
        savedPhoto.setPhotoType(PhotoType.DEVICE);
        savedPhoto.setFileName("iphone_123.jpg");
        savedPhoto.setFilePath("/tmp/iphone_123.jpg");
        savedPhoto.setContentType("image/jpeg");
        savedPhoto.setFileSize(16L);
        savedPhoto.setUploadedBy(staff);

        when(photoRepository.findByTicketIdOrderByCreatedAtAsc(ticketId)).thenReturn(List.of());
        when(photoRepository.save(any(DevicePhoto.class))).thenReturn(savedPhoto);

        DevicePhotoDto uploaded = ticketService.uploadPhoto(ticketId, PhotoType.DEVICE, file);

        assertNotNull(uploaded);
        assertEquals(photoId, uploaded.id());
        assertEquals(ticketId, uploaded.ticketId());
        assertEquals(PhotoType.DEVICE, uploaded.photoType());
        assertEquals("/api/files/tickets/" + ticketId + "/photos/" + photoId, uploaded.fileUrl());
        assertEquals("Staff Member", uploaded.uploadedByName());

        when(photoRepository.findByTicketIdOrderByCreatedAtAsc(ticketId)).thenReturn(List.of(savedPhoto));

        List<DevicePhotoDto> photoList = ticketService.getPhotos(ticketId);
        assertEquals(1, photoList.size());
        assertEquals(photoId, photoList.get(0).id());
    }

    @Test
    void testDeleteDevicePhoto() {
        UUID ticketId = UUID.randomUUID();
        UUID photoId = UUID.randomUUID();

        RepairTicket ticket = new RepairTicket();
        when(ticketRepository.findByIdWithDetails(ticketId)).thenReturn(Optional.of(ticket));

        DevicePhoto photo = new DevicePhoto();
        photo.setFilePath("/nonexistent/test/path.jpg");
        when(photoRepository.findByIdAndTicketId(photoId, ticketId)).thenReturn(Optional.of(photo));

        ticketService.deletePhoto(ticketId, photoId);

        verify(photoRepository).delete(photo);
    }

    @Test
    void testUploadPhoto_enforcesMaxTwoLimit() {
        UUID ticketId = UUID.randomUUID();

        RepairTicket ticket = new RepairTicket();
        ticket.setId(ticketId);
        when(ticketRepository.findByIdWithDetails(ticketId)).thenReturn(Optional.of(ticket));

        User staff = new User();
        staff.setFullName("Staff");
        when(securityUtils.getCurrentUser()).thenReturn(staff);

        DevicePhoto photo1 = new DevicePhoto();
        photo1.setId(UUID.randomUUID());
        photo1.setFilePath("/tmp/photo1.jpg");
        DevicePhoto photo2 = new DevicePhoto();
        photo2.setId(UUID.randomUUID());
        photo2.setFilePath("/tmp/photo2.jpg");

        // When 2 photos already exist, uploading a 3rd should delete the oldest (photo1)
        when(photoRepository.findByTicketIdOrderByCreatedAtAsc(ticketId)).thenReturn(List.of(photo1, photo2));

        when(fileStorageService.storeTicketPhoto(eq(ticketId), eq("device"), any()))
                .thenReturn(new FileStorageService.StoredFile("photo3.jpg", "/tmp/photo3.jpg", "image/jpeg", 20L));

        DevicePhoto photo3 = new DevicePhoto();
        photo3.setId(UUID.randomUUID());
        photo3.setTicket(ticket);
        photo3.setPhotoType(PhotoType.DEVICE);
        photo3.setFileName("photo3.jpg");
        photo3.setFilePath("/tmp/photo3.jpg");
        when(photoRepository.save(any(DevicePhoto.class))).thenReturn(photo3);

        MockMultipartFile file = new MockMultipartFile("file", "p3.jpg", "image/jpeg", new byte[10]);
        DevicePhotoDto uploaded = ticketService.uploadPhoto(ticketId, PhotoType.DEVICE, file);

        assertNotNull(uploaded);
        verify(photoRepository).delete(photo1); // Oldest removed
    }
}
