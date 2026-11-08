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
import com.famousmobiles.domain.Payment;
import com.famousmobiles.domain.RepairTicket;
import com.famousmobiles.domain.Store;
import com.famousmobiles.domain.TicketNote;
import com.famousmobiles.domain.TicketStatusHistory;
import com.famousmobiles.domain.User;
import com.famousmobiles.domain.enums.PaymentMode;
import com.famousmobiles.domain.enums.PhotoType;
import com.famousmobiles.domain.enums.RepairStatus;
import com.famousmobiles.domain.enums.UserRole;
import com.famousmobiles.dto.DevicePhotoDto;
import com.famousmobiles.dto.TicketDto;
import com.famousmobiles.exception.BadRequestException;
import com.famousmobiles.exception.ForbiddenException;
import com.famousmobiles.exception.ResourceNotFoundException;
import com.famousmobiles.repository.DevicePhotoRepository;
import com.famousmobiles.repository.PaymentRepository;
import com.famousmobiles.repository.RepairTicketRepository;
import com.famousmobiles.repository.StoreRepository;
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
    private final PaymentRepository paymentRepository;
    private final SecurityUtils securityUtils;
    private final StoreRepository storeRepository;

    @org.springframework.beans.factory.annotation.Autowired
    public TicketService(RepairTicketRepository ticketRepository,
            TicketStatusHistoryRepository historyRepository, TicketNoteRepository noteRepository,
            DevicePhotoRepository photoRepository, CustomerService customerService,
            TechnicianRepository technicianRepository, TrackingNumberService trackingNumberService,
            NotificationService notificationService, FileStorageService fileStorageService,
            PaymentRepository paymentRepository, SecurityUtils securityUtils,
            StoreRepository storeRepository) {
        this.ticketRepository = ticketRepository;
        this.historyRepository = historyRepository;
        this.noteRepository = noteRepository;
        this.photoRepository = photoRepository;
        this.customerService = customerService;
        this.technicianRepository = technicianRepository;
        this.trackingNumberService = trackingNumberService;
        this.notificationService = notificationService;
        this.fileStorageService = fileStorageService;
        this.paymentRepository = paymentRepository;
        this.securityUtils = securityUtils;
        this.storeRepository = storeRepository;
    }

    public TicketService(RepairTicketRepository ticketRepository,
            TicketStatusHistoryRepository historyRepository, TicketNoteRepository noteRepository,
            DevicePhotoRepository photoRepository, CustomerService customerService,
            TechnicianRepository technicianRepository, TrackingNumberService trackingNumberService,
            NotificationService notificationService, FileStorageService fileStorageService,
            PaymentRepository paymentRepository, SecurityUtils securityUtils) {
        this(ticketRepository, historyRepository, noteRepository, photoRepository, customerService,
                technicianRepository, trackingNumberService, notificationService, fileStorageService,
                paymentRepository, securityUtils, null);
    }

    @Transactional
    public TicketDto.TicketResponse create(TicketDto.CreateTicketRequest request) {
        User user = securityUtils.getCurrentUser();

        BigDecimal estCost = defaultZero(request.estimatedCost());
        BigDecimal advPaid = defaultZero(request.advancePaid());
        if (estCost.compareTo(BigDecimal.ZERO) < 0) {
            throw new BadRequestException("Estimated cost cannot be negative");
        }
        if (advPaid.compareTo(BigDecimal.ZERO) < 0) {
            throw new BadRequestException("Advance payment cannot be negative");
        }
        if (advPaid.compareTo(estCost) > 0) {
            throw new BadRequestException("Advance payment (₹" + advPaid + ") cannot exceed estimated cost (₹" + estCost + ")");
        }

        Store store = null;
        if (storeRepository != null) {
            if (request.storeId() != null) {
                store = storeRepository.findById(request.storeId())
                        .orElseThrow(() -> new ResourceNotFoundException("Store not found"));
            } else if (user != null && user.getDefaultStore() != null) {
                store = user.getDefaultStore();
            } else {
                store = storeRepository.findByCode("FM1").orElse(null);
            }
        }
        String storeCode = store != null ? store.getCode() : "FM1";

        RepairTicket ticket = new RepairTicket();
        String trackingNum = (store != null && store.getCode() != null)
                ? trackingNumberService.generateTrackingNumber(store.getCode())
                : trackingNumberService.generateTrackingNumber();
        ticket.setTrackingNumber(trackingNum);
        ticket.setCustomer(customerService.getEntity(request.customerId()));
        ticket.setStore(store);
        ticket.setCreatedBy(user);
        ticket.setStatus(RepairStatus.DEVICE_RECEIVED);
        applyDeviceDetails(ticket, request);
        ticket.setEstimatedCost(estCost);
        ticket.setAdvancePaid(advPaid);
        recalculateBalance(ticket);
        if (request.warrantyDays() != null) {
            ticket.setWarrantyDays(request.warrantyDays());
        }
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
        if (advPaid.compareTo(BigDecimal.ZERO) > 0) {
            Payment payment = new Payment();
            payment.setTicket(ticket);
            payment.setStore(store);
            payment.setAmount(advPaid);
            payment.setPaymentMode(PaymentMode.CASH);
            payment.setNotes("Advance collected at device intake");
            payment.setRecordedBy(user);
            paymentRepository.save(payment);
        }
        String initialRemarks = "Device received";
        if (advPaid.compareTo(BigDecimal.ZERO) > 0) {
            initialRemarks += " · Advance of ₹" + advPaid + " (CASH) collected by " + user.getFullName();
        }
        recordStatusHistory(ticket, null, RepairStatus.DEVICE_RECEIVED, user, initialRemarks, null);
        notificationService.onStatusChange(ticket, RepairStatus.DEVICE_RECEIVED);
        return TicketDto.TicketResponse.from(ticket);
    }

    @Transactional(readOnly = true)
    public TicketDto.TicketResponse get(UUID id) {
        RepairTicket ticket = getEntityWithAccess(id);
        List<DevicePhotoDto> photos = photoRepository.findByTicketIdOrderByCreatedAtAsc(id).stream()
                .map(this::toPhotoDto).toList();
        return TicketDto.TicketResponse.from(ticket, photos);
    }

    @Transactional(readOnly = true)
    public List<TicketDto.TicketResponse> list() {
        return list(null);
    }

    @Transactional(readOnly = true)
    public List<TicketDto.TicketResponse> list(UUID storeId) {
        List<RepairTicket> tickets;
        if (storeId != null) {
            tickets = ticketRepository.findByStoreIdWithDetailsOrderByCreatedAtDesc(storeId);
        } else {
            tickets = ticketRepository.findAllWithDetailsOrderByCreatedAtDesc();
        }
        return tickets.stream().map(TicketDto.TicketResponse::from).toList();
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
            BigDecimal newCost = request.estimatedCost();
            if (newCost.compareTo(BigDecimal.ZERO) < 0) {
                throw new BadRequestException("Estimated cost cannot be negative");
            }
            BigDecimal adv = ticket.getAdvancePaid() != null ? ticket.getAdvancePaid() : BigDecimal.ZERO;
            if (newCost.compareTo(adv) < 0) {
                throw new BadRequestException("Estimated cost (₹" + newCost + ") cannot be less than advance already collected (₹" + adv + ")");
            }
            BigDecimal oldCost = ticket.getEstimatedCost() != null ? ticket.getEstimatedCost() : BigDecimal.ZERO;
            ticket.setEstimatedCost(newCost);
            recalculateBalance(ticket);
            if (newCost.compareTo(oldCost) != 0) {
                User user = securityUtils.getCurrentUser();
                String note = "Estimated cost updated from ₹" + oldCost + " to ₹" + newCost + " (Balance: ₹" + ticket.getBalanceAmount() + ")";
                recordStatusHistory(ticket, ticket.getStatus(), ticket.getStatus(), user, note, null);
            }
        }
        if (request.warrantyDays() != null) {
            ticket.setWarrantyDays(request.warrantyDays());
        }
        if (request.estimatedDeliveryDate() != null && !request.estimatedDeliveryDate().isBlank()) {
            LocalDate newDate = LocalDate.parse(request.estimatedDeliveryDate());
            if (!newDate.equals(ticket.getEstimatedDeliveryDate())) {
                LocalDate oldDate = ticket.getEstimatedDeliveryDate();
                ticket.setEstimatedDeliveryDate(newDate);
                User user = securityUtils.getCurrentUser();
                String note = "Delivery date rescheduled" + (oldDate != null ? " from " + oldDate : "") + " to " + newDate;
                recordStatusHistory(ticket, ticket.getStatus(), ticket.getStatus(), user, note, null);
            }
        }
        return TicketDto.TicketResponse.from(ticketRepository.save(ticket));
    }

    @Transactional
    public TicketDto.TicketResponse updateEstimation(UUID id, TicketDto.UpdateEstimationRequest request) {
        RepairTicket ticket = getEntityWithAccess(id);
        if (ticket.getStatus() == RepairStatus.DELIVERED || ticket.getStatus() == RepairStatus.RETURNED_UNREPAIRED) {
            throw new BadRequestException("Cannot update estimation for completed/closed ticket");
        }
        BigDecimal oldCost = ticket.getEstimatedCost() != null ? ticket.getEstimatedCost() : BigDecimal.ZERO;
        BigDecimal newCost = request.estimatedCost() != null ? request.estimatedCost() : BigDecimal.ZERO;
        if (newCost.compareTo(BigDecimal.ZERO) < 0) {
            throw new BadRequestException("Estimated cost cannot be negative");
        }
        BigDecimal adv = ticket.getAdvancePaid() != null ? ticket.getAdvancePaid() : BigDecimal.ZERO;
        if (newCost.compareTo(adv) < 0) {
            throw new BadRequestException("Estimated cost (₹" + newCost + ") cannot be less than advance already collected (₹" + adv + ")");
        }
        ticket.setEstimatedCost(newCost);
        if (request.warrantyDays() != null) {
            ticket.setWarrantyDays(request.warrantyDays());
        }
        recalculateBalance(ticket);
        ticket = ticketRepository.save(ticket);

        User user = securityUtils.getCurrentUser();
        String timelineNote = "Estimated repair cost updated from ₹" + oldCost + " to ₹" + newCost +
                " (Balance: ₹" + ticket.getBalanceAmount() + ")";
        if (request.warrantyDays() != null) {
            timelineNote += " · Warranty: " + (request.warrantyDays() > 0 ? request.warrantyDays() + " Days" : "Testing Only");
        }
        if (request.remarks() != null && !request.remarks().isBlank()) {
            timelineNote += " · " + request.remarks().trim();
        }
        recordStatusHistory(ticket, ticket.getStatus(), ticket.getStatus(), user, timelineNote, null);
        return TicketDto.TicketResponse.from(ticket);
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
        String finalRemarks = request.remarks();
        if (target == RepairStatus.DELIVERED) {
            if (ticket.getBalanceAmount() != null && ticket.getBalanceAmount().compareTo(BigDecimal.ZERO) > 0) {
                throw new BadRequestException("Cannot deliver device with pending balance of ₹" + ticket.getBalanceAmount() + ". Please record payment first.");
            }
            ticket.setDeliveredAt(Instant.now());
        } else if (target == RepairStatus.RETURNED_UNREPAIRED) {
            ticket.setDeliveredAt(Instant.now());
            BigDecimal refundAdvance = ticket.getAdvancePaid() != null ? ticket.getAdvancePaid() : BigDecimal.ZERO;
            ticket.setEstimatedCost(BigDecimal.ZERO);
            ticket.setAdvancePaid(BigDecimal.ZERO);
            ticket.setBalanceAmount(BigDecimal.ZERO);
            if (refundAdvance.compareTo(BigDecimal.ZERO) > 0) {
                finalRemarks = (finalRemarks != null && !finalRemarks.isBlank() ? finalRemarks + " · " : "") +
                        "Total cost set to ₹0. Advance of ₹" + refundAdvance + " refunded to customer.";
            }
        }
        ticketRepository.save(ticket);
        recordStatusHistory(ticket, current, target, user, finalRemarks, request.technicianNotes());
        notificationService.onStatusChange(ticket, target);
        return TicketDto.TicketResponse.from(ticket);
    }

    @Transactional
    public TicketDto.TicketResponse reopenTicket(UUID id, TicketDto.ReopenTicketRequest request) {
        RepairTicket ticket = getEntityWithAccess(id);
        if (ticket.getStatus() != RepairStatus.DELIVERED) {
            throw new BadRequestException("Only delivered tickets can be reopened for re-check or rework (Current status: " + formatStatus(ticket.getStatus()) + ")");
        }
        if (request.remarks() == null || request.remarks().trim().isEmpty()) {
            throw new BadRequestException("Customer complaint / remarks are required when reopening a ticket");
        }

        User user = securityUtils.getCurrentUser();
        long daysSinceDelivery = ticket.getDeliveredAt() != null
                ? java.time.Duration.between(ticket.getDeliveredAt(), Instant.now()).toDays()
                : 0;
        int warranty = ticket.getWarrantyDays() != null ? ticket.getWarrantyDays() : 0;
        boolean isFreeRecheck = daysSinceDelivery <= Math.max(7, warranty);

        BigDecimal extraCost = request.additionalCost() != null ? request.additionalCost() : BigDecimal.ZERO;
        if (extraCost.compareTo(BigDecimal.ZERO) < 0) {
            throw new BadRequestException("Additional cost cannot be negative");
        }

        if (extraCost.compareTo(BigDecimal.ZERO) > 0) {
            ticket.setEstimatedCost(ticket.getEstimatedCost().add(extraCost));
            recalculateBalance(ticket);
        }

        if (request.technicianId() != null) {
            var tech = technicianRepository.findById(request.technicianId())
                    .orElseThrow(() -> new ResourceNotFoundException("Technician not found"));
            ticket.setAssignedTechnician(tech);
        }

        RepairStatus previousStatus = ticket.getStatus();
        ticket.setStatus(RepairStatus.UNDER_DIAGNOSIS);
        ticket.setReopenCount(ticket.getReopenCount() + 1);
        ticket.setLastReopenedAt(Instant.now());

        String reason = request.reason() != null && !request.reason().isBlank()
                ? request.reason().trim()
                : (isFreeRecheck ? "7-Day Free Re-Check" : "Post-Delivery Rework");
        ticket.setReopenReason(reason);

        ticket = ticketRepository.save(ticket);

        StringBuilder historyNote = new StringBuilder();
        if (isFreeRecheck) {
            historyNote.append("Device returned for 7-Day Free Quality Re-Check / Warranty (Day ").append(daysSinceDelivery).append(")");
        } else {
            historyNote.append("Device returned for Post-Delivery Rework (Day ").append(daysSinceDelivery).append(")");
        }
        historyNote.append(" · Reason: ").append(reason);
        if (extraCost.compareTo(BigDecimal.ZERO) > 0) {
            historyNote.append(" · Additional Charge: ₹").append(extraCost);
        } else {
            historyNote.append(" · Free of Charge (₹0)");
        }
        if (ticket.getAssignedTechnician() != null) {
            historyNote.append(" · Assigned to: ").append(ticket.getAssignedTechnician().getName());
        }

        recordStatusHistory(ticket, previousStatus, RepairStatus.UNDER_DIAGNOSIS, user, historyNote.toString(), request.remarks().trim());
        notificationService.onStatusChange(ticket, RepairStatus.UNDER_DIAGNOSIS);

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

    public DevicePhotoDto toPhotoDto(DevicePhoto p) {
        String fileUrl = "/api/files/tickets/" + p.getTicket().getId() + "/photos/" + p.getId();
        String uploader = p.getUploadedBy() != null ? p.getUploadedBy().getFullName() : null;
        return new DevicePhotoDto(
                p.getId(),
                p.getTicket().getId(),
                p.getPhotoType(),
                p.getFileName(),
                fileUrl,
                p.getContentType(),
                p.getFileSize(),
                uploader,
                p.getCreatedAt()
        );
    }

    @Transactional
    public DevicePhotoDto uploadPhoto(UUID id, PhotoType photoType, MultipartFile file) {
        RepairTicket ticket = getEntityWithAccess(id);

        // Maximum 2 photos policy: if 2 photos already exist, remove the oldest one
        List<DevicePhoto> existing = photoRepository.findByTicketIdOrderByCreatedAtAsc(id);
        if (existing.size() >= 2) {
            DevicePhoto oldest = existing.get(0);
            photoRepository.delete(oldest);
            try {
                java.nio.file.Files.deleteIfExists(java.nio.file.Paths.get(oldest.getFilePath()));
            } catch (Exception ignored) {}
        }

        PhotoType effectiveType = photoType != null ? photoType : PhotoType.DEVICE;
        var stored = fileStorageService.storeTicketPhoto(id, effectiveType.name().toLowerCase(), file);
        DevicePhoto photo = new DevicePhoto();
        photo.setTicket(ticket);
        photo.setPhotoType(effectiveType);
        photo.setFileName(stored.fileName());
        photo.setFilePath(stored.filePath());
        photo.setContentType(stored.contentType());
        photo.setFileSize(stored.fileSize());
        try {
            photo.setUploadedBy(securityUtils.getCurrentUser());
        } catch (Exception ignored) {}
        DevicePhoto saved = photoRepository.save(photo);
        return toPhotoDto(saved);
    }

    public List<DevicePhotoDto> getPhotos(UUID id) {
        getEntityWithAccess(id);
        return photoRepository.findByTicketIdOrderByCreatedAtAsc(id).stream()
                .map(this::toPhotoDto).toList();
    }

    public DevicePhoto getPhotoEntity(UUID ticketId, UUID photoId) {
        return photoRepository.findByIdAndTicketId(photoId, ticketId)
                .orElseThrow(() -> new ResourceNotFoundException("Photo not found"));
    }

    @Transactional
    public void deletePhoto(UUID ticketId, UUID photoId) {
        getEntityWithAccess(ticketId);
        DevicePhoto photo = photoRepository.findByIdAndTicketId(photoId, ticketId)
                .orElseThrow(() -> new ResourceNotFoundException("Photo not found"));
        photoRepository.delete(photo);
        try {
            java.nio.file.Files.deleteIfExists(java.nio.file.Paths.get(photo.getFilePath()));
        } catch (Exception ignored) {}
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
        BigDecimal est = ticket.getEstimatedCost() != null ? ticket.getEstimatedCost() : BigDecimal.ZERO;
        BigDecimal adv = ticket.getAdvancePaid() != null ? ticket.getAdvancePaid() : BigDecimal.ZERO;
        ticket.setBalanceAmount(est.subtract(adv).max(BigDecimal.ZERO));
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
