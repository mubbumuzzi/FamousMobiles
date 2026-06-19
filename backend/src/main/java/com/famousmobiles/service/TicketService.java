package com.famousmobiles.service;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import com.famousmobiles.domain.DevicePhoto;
import com.famousmobiles.domain.RepairTicket;
import com.famousmobiles.domain.TicketNote;
import com.famousmobiles.domain.TicketStatusHistory;
import com.famousmobiles.domain.User;
import com.famousmobiles.domain.enums.PhotoType;
import com.famousmobiles.domain.enums.RepairStatus;
import com.famousmobiles.domain.enums.UserRole;
import com.famousmobiles.dto.TicketDto;
import com.famousmobiles.exception.BadRequestException;
import com.famousmobiles.exception.ForbiddenException;
import com.famousmobiles.exception.ResourceNotFoundException;
import com.famousmobiles.repository.DevicePhotoRepository;
import com.famousmobiles.repository.RepairTicketRepository;
import com.famousmobiles.repository.TicketNoteRepository;
import com.famousmobiles.repository.TicketStatusHistoryRepository;
import com.famousmobiles.repository.TechnicianRepository;
import com.famousmobiles.security.SecurityUtils;

@Service
public class TicketService {

    private final RepairTicketRepository ticketRepository;
    private final TicketStatusHistoryRepository historyRepository;
    private final TicketNoteRepository noteRepository;
    private final DevicePhotoRepository photoRepository;
    private final CustomerService customerService;
    private final TechnicianRepository technicianRepository;
    private final TrackingNumberService trackingNumberService;
    private final NotificationService notificationService;
    private final FileStorageService fileStorageService;
    private final SecurityUtils securityUtils;

    public TicketService(RepairTicketRepository ticketRepository,
            TicketStatusHistoryRepository historyRepository, TicketNoteRepository noteRepository,
            DevicePhotoRepository photoRepository, CustomerService customerService,
            TechnicianRepository technicianRepository, TrackingNumberService trackingNumberService,
            NotificationService notificationService, FileStorageService fileStorageService,
            SecurityUtils securityUtils) {
        this.ticketRepository = ticketRepository;
        this.historyRepository = historyRepository;
        this.noteRepository = noteRepository;
        this.photoRepository = photoRepository;
        this.customerService = customerService;
        this.technicianRepository = technicianRepository;
        this.trackingNumberService = trackingNumberService;
        this.notificationService = notificationService;
        this.fileStorageService = fileStorageService;
        this.securityUtils = securityUtils;
    }

    @Transactional
    public TicketDto.TicketResponse create(TicketDto.CreateTicketRequest request) {
        User user = securityUtils.getCurrentUser();

        RepairTicket ticket = new RepairTicket();
        ticket.setTrackingNumber(trackingNumberService.generateTrackingNumber());
        ticket.setCustomer(customerService.getEntity(request.customerId()));
        ticket.setCreatedBy(user);
        ticket.setStatus(RepairStatus.DEVICE_RECEIVED);
        applyDeviceDetails(ticket, request);
        ticket.setEstimatedCost(defaultZero(request.estimatedCost()));
        ticket.setAdvancePaid(defaultZero(request.advancePaid()));
        recalculateBalance(ticket);
        if (request.estimatedDeliveryDate() != null && !request.estimatedDeliveryDate().isBlank()) {
            ticket.setEstimatedDeliveryDate(LocalDate.parse(request.estimatedDeliveryDate()));
        }
        ticket = ticketRepository.save(ticket);
        if (user.getRole() == UserRole.TECHNICIAN) {
            var tech = technicianRepository.findByUserId(user.getId());
            if (tech.isPresent()) {
                ticket.setAssignedTechnician(tech.get());
                ticket = ticketRepository.save(ticket);
            }
        }
        recordStatusHistory(ticket, null, RepairStatus.DEVICE_RECEIVED, user, "Device received", null);
        notificationService.onStatusChange(ticket, RepairStatus.DEVICE_RECEIVED);
        return TicketDto.TicketResponse.from(ticket);
    }

    @Transactional(readOnly = true)
    public TicketDto.TicketResponse get(UUID id) {
        return TicketDto.TicketResponse.from(getEntityWithAccess(id));
    }

    @Transactional(readOnly = true)
    public List<TicketDto.TicketResponse> list() {
        return ticketRepository.findAllWithDetailsOrderByCreatedAtDesc().stream()
                .map(TicketDto.TicketResponse::from).toList();
    }

    @Transactional
    public TicketDto.TicketResponse update(UUID id, TicketDto.UpdateTicketRequest request) {
        RepairTicket ticket = getEntityWithAccess(id);
        if (request.brand() != null) ticket.setBrand(request.brand());
        if (request.model() != null) ticket.setModel(request.model());
        if (request.color() != null) ticket.setColor(request.color());
        if (request.imei() != null) ticket.setImei(request.imei());
        if (request.accessoriesReceived() != null) ticket.setAccessoriesReceived(request.accessoriesReceived());
        if (request.deviceCondition() != null) ticket.setDeviceCondition(request.deviceCondition());
        if (request.problemDescription() != null) ticket.setProblemDescription(request.problemDescription());
        if (request.estimatedCost() != null) {
            ticket.setEstimatedCost(request.estimatedCost());
            recalculateBalance(ticket);
        }
        if (request.estimatedDeliveryDate() != null && !request.estimatedDeliveryDate().isBlank()) {
            ticket.setEstimatedDeliveryDate(LocalDate.parse(request.estimatedDeliveryDate()));
        }
        return TicketDto.TicketResponse.from(ticketRepository.save(ticket));
    }

    @Transactional
    public TicketDto.TicketResponse updateStatus(UUID id, TicketDto.StatusUpdateRequest request) {
        RepairTicket ticket = getEntityWithAccess(id);
        RepairStatus current = ticket.getStatus();
        RepairStatus target = request.status();
        if (!current.canTransitionTo(target)) {
            throw new BadRequestException("Invalid status transition from " + current + " to " + target);
        }
        User user = securityUtils.getCurrentUser();
        ticket.setStatus(target);
        if (target == RepairStatus.DELIVERED) {
            ticket.setDeliveredAt(Instant.now());
        }
        ticketRepository.save(ticket);
        recordStatusHistory(ticket, current, target, user, request.remarks(), request.technicianNotes());
        notificationService.onStatusChange(ticket, target);
        return TicketDto.TicketResponse.from(ticket);
    }

    @Transactional
    public TicketDto.TicketResponse assignTechnician(UUID id, TicketDto.AssignTechnicianRequest request) {
        if (!securityUtils.isAdmin()) {
            throw new ForbiddenException("Only admin can assign technicians");
        }
        RepairTicket ticket = getEntity(id);
        ticket.setAssignedTechnician(technicianRepository.findById(request.technicianId())
                .orElseThrow(() -> new ResourceNotFoundException("Technician not found")));
        return TicketDto.TicketResponse.from(ticketRepository.save(ticket));
    }

    @Transactional
    public TicketDto.TicketResponse assignSelf(UUID id) {
        RepairTicket ticket = getEntityWithAccess(id);
        if (ticket.getAssignedTechnician() != null) {
            throw new BadRequestException("This ticket is already assigned to " + ticket.getAssignedTechnician().getName());
        }
        ticket.setAssignedTechnician(requireTechnicianProfile());
        return TicketDto.TicketResponse.from(ticketRepository.save(ticket));
    }

    private com.famousmobiles.domain.Technician requireTechnicianProfile() {
        User user = securityUtils.getCurrentUser();
        if (user.getRole() != UserRole.TECHNICIAN) {
            throw new ForbiddenException("Only technicians can assign themselves");
        }
        return technicianRepository.findByUserId(user.getId())
                .orElseThrow(() -> new BadRequestException(
                        "Technician profile not found. Ask admin to add you in Staff with the Technician role."));
    }

    @Transactional
    public TicketDto.TimelineEntry addNote(UUID id, String content) {
        RepairTicket ticket = getEntityWithAccess(id);
        TicketNote note = new TicketNote();
        note.setTicket(ticket);
        note.setAuthor(securityUtils.getCurrentUser());
        note.setContent(content);
        note = noteRepository.save(note);
        return new TicketDto.TimelineEntry(note.getId(), "NOTE", "Note added", note.getContent(),
                note.getAuthor().getFullName(), note.getCreatedAt().toString());
    }

    @Transactional(readOnly = true)
    public List<TicketDto.TimelineEntry> getTimeline(UUID id) {
        getEntityWithAccess(id);
        List<TicketDto.TimelineEntry> entries = new ArrayList<>();
        historyRepository.findByTicketIdWithChangedByOrderByCreatedAtAsc(id).forEach(h -> entries.add(
                new TicketDto.TimelineEntry(h.getId(), "STATUS", formatStatus(h.getToStatus()),
                        combineHistoryText(h), h.getChangedBy() != null ? h.getChangedBy().getFullName() : "System",
                        h.getCreatedAt().toString())));
        noteRepository.findByTicketIdWithAuthorOrderByCreatedAtAsc(id).forEach(n -> entries.add(
                new TicketDto.TimelineEntry(n.getId(), "NOTE", "Note", n.getContent(),
                        n.getAuthor() != null ? n.getAuthor().getFullName() : "System", n.getCreatedAt().toString())));
        entries.sort(Comparator.comparing(TicketDto.TimelineEntry::createdAt));
        return entries;
    }

    @Transactional
    public DevicePhoto uploadPhoto(UUID id, PhotoType photoType, MultipartFile file) {
        RepairTicket ticket = getEntityWithAccess(id);
        var stored = fileStorageService.storeTicketPhoto(id, photoType.name().toLowerCase(), file);
        DevicePhoto photo = new DevicePhoto();
        photo.setTicket(ticket);
        photo.setPhotoType(photoType);
        photo.setFileName(stored.fileName());
        photo.setFilePath(stored.filePath());
        photo.setContentType(stored.contentType());
        photo.setFileSize(stored.fileSize());
        photo.setUploadedBy(securityUtils.getCurrentUser());
        return photoRepository.save(photo);
    }

    public List<DevicePhoto> getPhotos(UUID id) {
        getEntityWithAccess(id);
        return photoRepository.findByTicketIdOrderByCreatedAtAsc(id);
    }

    public RepairTicket getEntity(UUID id) {
        return ticketRepository.findByIdWithDetails(id)
                .orElseThrow(() -> new ResourceNotFoundException("Ticket not found"));
    }

    public RepairTicket getEntityWithAccess(UUID id) {
        return getEntity(id);
    }

    private void applyDeviceDetails(RepairTicket ticket, TicketDto.CreateTicketRequest request) {
        ticket.setDeviceType(request.deviceType());
        ticket.setBrand(request.brand());
        ticket.setModel(request.model());
        ticket.setColor(request.color());
        ticket.setImei(request.imei());
        ticket.setAccessoriesReceived(request.accessoriesReceived() != null ? request.accessoriesReceived() : List.of());
        ticket.setDeviceCondition(request.deviceCondition() != null ? request.deviceCondition() : List.of());
        ticket.setProblemDescription(request.problemDescription());
    }

    private void recordStatusHistory(RepairTicket ticket, RepairStatus from, RepairStatus to, User user,
            String remarks, String technicianNotes) {
        TicketStatusHistory history = new TicketStatusHistory();
        history.setTicket(ticket);
        history.setFromStatus(from);
        history.setToStatus(to);
        history.setChangedBy(user);
        history.setRemarks(remarks);
        history.setTechnicianNotes(technicianNotes);
        historyRepository.save(history);
    }

    private void recalculateBalance(RepairTicket ticket) {
        ticket.setBalanceAmount(ticket.getEstimatedCost().subtract(ticket.getAdvancePaid()));
    }

    private BigDecimal defaultZero(BigDecimal value) {
        return value != null ? value : BigDecimal.ZERO;
    }

    private String formatStatus(RepairStatus status) {
        return status.name().replace('_', ' ');
    }

    private String combineHistoryText(TicketStatusHistory h) {
        StringBuilder sb = new StringBuilder(formatStatus(h.getToStatus()));
        if (h.getRemarks() != null && !h.getRemarks().isBlank()) {
            sb.append(" — ").append(h.getRemarks());
        }
        if (h.getTechnicianNotes() != null && !h.getTechnicianNotes().isBlank()) {
            sb.append(" [").append(h.getTechnicianNotes()).append("]");
        }
        return sb.toString();
    }

    public static List<RepairStatus> allStatuses() {
        return Arrays.asList(RepairStatus.values());
    }
}
