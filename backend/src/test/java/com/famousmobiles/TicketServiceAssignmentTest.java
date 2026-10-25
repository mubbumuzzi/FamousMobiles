package com.famousmobiles;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.famousmobiles.domain.Customer;
import com.famousmobiles.domain.RepairTicket;
import com.famousmobiles.domain.Technician;
import com.famousmobiles.domain.User;
import com.famousmobiles.domain.enums.DeviceType;
import com.famousmobiles.domain.enums.RepairStatus;
import com.famousmobiles.domain.enums.UserRole;
import com.famousmobiles.dto.TicketDto;
import com.famousmobiles.exception.BadRequestException;
import com.famousmobiles.exception.ForbiddenException;
import com.famousmobiles.repository.DevicePhotoRepository;
import com.famousmobiles.repository.PaymentRepository;
import com.famousmobiles.repository.RepairTicketRepository;
import com.famousmobiles.repository.TicketNoteRepository;
import com.famousmobiles.repository.TicketStatusHistoryRepository;
import com.famousmobiles.repository.TechnicianRepository;
import com.famousmobiles.security.SecurityUtils;
import com.famousmobiles.service.CustomerService;
import com.famousmobiles.service.FileStorageService;
import com.famousmobiles.service.NotificationService;
import com.famousmobiles.service.TicketService;
import com.famousmobiles.service.TrackingNumberService;

@ExtendWith(MockitoExtension.class)
class TicketServiceAssignmentTest {

    @Mock private RepairTicketRepository ticketRepository;
    @Mock private TicketStatusHistoryRepository historyRepository;
    @Mock private TicketNoteRepository noteRepository;
    @Mock private DevicePhotoRepository photoRepository;
    @Mock private CustomerService customerService;
    @Mock private TechnicianRepository technicianRepository;
    @Mock private TrackingNumberService trackingNumberService;
    @Mock private NotificationService notificationService;
    @Mock private FileStorageService fileStorageService;
    @Mock private PaymentRepository paymentRepository;
    @Mock private SecurityUtils securityUtils;

    @InjectMocks private TicketService ticketService;

    private UUID ticketId;
    private UUID userId;
    private UUID techId;
    private User technicianUser;
    private Technician technicianProfile;
    private RepairTicket ticket;

    @BeforeEach
    void setUp() {
        ticketId = UUID.randomUUID();
        userId = UUID.randomUUID();
        techId = UUID.randomUUID();

        technicianUser = new User();
        technicianUser.setId(userId);
        technicianUser.setRole(UserRole.TECHNICIAN);
        technicianUser.setFullName("Ali Technician");

        technicianProfile = new Technician();
        technicianProfile.setId(techId);
        technicianProfile.setName("Ali Technician");
        technicianProfile.setMobile("9876543210");

        ticket = sampleTicket();
    }

    @Test
    void assignSelf_assignsTechnicianToUnassignedTicket() {
        when(securityUtils.getCurrentUser()).thenReturn(technicianUser);
        when(ticketRepository.findByIdWithDetails(ticketId)).thenReturn(Optional.of(ticket));
        when(technicianRepository.findByUserId(userId)).thenReturn(Optional.of(technicianProfile));
        when(ticketRepository.save(any(RepairTicket.class))).thenAnswer(invocation -> invocation.getArgument(0));

        var response = ticketService.assignSelf(ticketId);

        assertEquals(techId, response.assignedTechnicianId());
        assertEquals("Ali Technician", response.assignedTechnicianName());
        verify(ticketRepository).save(ticket);
        assertEquals(technicianProfile, ticket.getAssignedTechnician());
    }

    @Test
    void assignSelf_rejectsAlreadyAssignedTicket() {
        Technician other = new Technician();
        other.setName("Someone Else");
        ticket.setAssignedTechnician(other);

        when(ticketRepository.findByIdWithDetails(ticketId)).thenReturn(Optional.of(ticket));

        assertThrows(BadRequestException.class, () -> ticketService.assignSelf(ticketId));
    }

    @Test
    void assignSelf_requiresTechnicianProfile() {
        when(securityUtils.getCurrentUser()).thenReturn(technicianUser);
        when(ticketRepository.findByIdWithDetails(ticketId)).thenReturn(Optional.of(ticket));
        when(technicianRepository.findByUserId(userId)).thenReturn(Optional.empty());

        assertThrows(BadRequestException.class, () -> ticketService.assignSelf(ticketId));
    }

    @Test
    void assignTechnician_allowsAdminToAssign() {
        UUID chosenTechId = UUID.randomUUID();
        Technician chosen = new Technician();
        chosen.setId(chosenTechId);
        chosen.setName("Chosen Tech");

        User admin = new User();
        admin.setRole(UserRole.ADMIN);

        when(securityUtils.isAdmin()).thenReturn(true);
        when(ticketRepository.findByIdWithDetails(ticketId)).thenReturn(Optional.of(ticket));
        when(technicianRepository.findById(chosenTechId)).thenReturn(Optional.of(chosen));
        when(ticketRepository.save(any(RepairTicket.class))).thenAnswer(invocation -> invocation.getArgument(0));

        var response = ticketService.assignTechnician(ticketId,
                new TicketDto.AssignTechnicianRequest(chosenTechId));

        assertEquals(chosenTechId, response.assignedTechnicianId());
        assertEquals("Chosen Tech", response.assignedTechnicianName());
    }

    @Test
    void assignTechnician_rejectsNonAdmin() {
        when(securityUtils.isAdmin()).thenReturn(false);

        assertThrows(ForbiddenException.class, () -> ticketService.assignTechnician(ticketId,
                new TicketDto.AssignTechnicianRequest(UUID.randomUUID())));
    }

    @Test
    void create_autoAssignsTechnicianWhenCreatorIsTechnician() {
        UUID customerId = UUID.randomUUID();
        Customer customer = new Customer();
        customer.setId(customerId);
        customer.setCustomerCode("FM-C001");
        customer.setFullName("Customer");
        customer.setMobile("9000000001");
        customer.setCreatedAt(Instant.now());

        when(securityUtils.getCurrentUser()).thenReturn(technicianUser);
        when(customerService.getEntity(customerId)).thenReturn(customer);
        when(trackingNumberService.generateTrackingNumber()).thenReturn("FM260001");
        when(technicianRepository.findByUserId(userId)).thenReturn(Optional.of(technicianProfile));
        when(ticketRepository.save(any(RepairTicket.class))).thenAnswer(invocation -> {
            RepairTicket saved = invocation.getArgument(0);
            if (saved.getId() == null) {
                saved.setId(ticketId);
            }
            if (saved.getCreatedAt() == null) {
                saved.setCreatedAt(Instant.now());
            }
            return saved;
        });

        var request = new TicketDto.CreateTicketRequest(
                customerId, DeviceType.MOBILE, "Samsung", "A14", "Black", null,
                null, null, "Screen broken", BigDecimal.ZERO, BigDecimal.ZERO, null);

        var response = ticketService.create(request);

        assertEquals(techId, response.assignedTechnicianId());
        assertEquals("Ali Technician", response.assignedTechnicianName());
    }

    @Test
    void create_doesNotAssignWhenCreatorIsSalesman() {
        UUID customerId = UUID.randomUUID();
        Customer customer = new Customer();
        customer.setId(customerId);
        customer.setCustomerCode("FM-C002");
        customer.setFullName("Customer");
        customer.setMobile("9000000002");
        customer.setCreatedAt(Instant.now());

        User salesman = new User();
        salesman.setId(UUID.randomUUID());
        salesman.setRole(UserRole.SALESMAN);

        when(securityUtils.getCurrentUser()).thenReturn(salesman);
        when(customerService.getEntity(customerId)).thenReturn(customer);
        when(trackingNumberService.generateTrackingNumber()).thenReturn("FM260002");
        when(ticketRepository.save(any(RepairTicket.class))).thenAnswer(invocation -> {
            RepairTicket saved = invocation.getArgument(0);
            saved.setId(ticketId);
            saved.setCreatedAt(Instant.now());
            return saved;
        });

        var request = new TicketDto.CreateTicketRequest(
                customerId, DeviceType.MOBILE, "Apple", "iPhone", "White", null,
                null, null, "Battery", BigDecimal.ZERO, BigDecimal.ZERO, null);

        var response = ticketService.create(request);

        assertNull(response.assignedTechnicianId());
        assertNull(response.assignedTechnicianName());
    }

    @Test
    void updateStatusToDelivered_withPendingBalance_throwsBadRequestException() {
        RepairTicket t = sampleTicket();
        t.setStatus(RepairStatus.READY_FOR_PICKUP);
        t.setBalanceAmount(new BigDecimal("500.00"));
        when(ticketRepository.findByIdWithDetails(ticketId)).thenReturn(Optional.of(t));

        var request = new TicketDto.StatusUpdateRequest(RepairStatus.DELIVERED, "Delivering device", null);

        BadRequestException ex = assertThrows(BadRequestException.class,
                () -> ticketService.updateStatus(ticketId, request));
        assertEquals("Cannot deliver device with pending balance of ₹500.00. Please record payment first.", ex.getMessage());
    }

    @Test
    void updateStatusToDelivered_withZeroBalance_succeeds() {
        RepairTicket t = sampleTicket();
        t.setStatus(RepairStatus.READY_FOR_PICKUP);
        t.setBalanceAmount(BigDecimal.ZERO);
        when(ticketRepository.findByIdWithDetails(ticketId)).thenReturn(Optional.of(t));
        when(securityUtils.getCurrentUser()).thenReturn(technicianUser);
        when(ticketRepository.save(any(RepairTicket.class))).thenReturn(t);

        var request = new TicketDto.StatusUpdateRequest(RepairStatus.DELIVERED, "Delivered and paid", null);

        var response = ticketService.updateStatus(ticketId, request);
        assertEquals(RepairStatus.DELIVERED, response.status());
        verify(ticketRepository).save(t);
    }

    @Test
    void updateStatusToReturnedUnrepaired_resetsCostAndAdvance() {
        RepairTicket t = sampleTicket();
        t.setStatus(RepairStatus.UNDER_DIAGNOSIS);
        t.setEstimatedCost(new BigDecimal("1500.00"));
        t.setAdvancePaid(new BigDecimal("300.00"));
        t.setBalanceAmount(new BigDecimal("1200.00"));
        when(ticketRepository.findByIdWithDetails(ticketId)).thenReturn(Optional.of(t));
        when(securityUtils.getCurrentUser()).thenReturn(technicianUser);
        when(ticketRepository.save(any(RepairTicket.class))).thenReturn(t);

        var request = new TicketDto.StatusUpdateRequest(
                RepairStatus.RETURNED_UNREPAIRED, "Customer changed mind - cancel repair", null);

        var response = ticketService.updateStatus(ticketId, request);
        assertEquals(RepairStatus.RETURNED_UNREPAIRED, response.status());
        assertEquals(BigDecimal.ZERO, t.getEstimatedCost());
        assertEquals(BigDecimal.ZERO, t.getAdvancePaid());
        assertEquals(BigDecimal.ZERO, t.getBalanceAmount());
        verify(ticketRepository).save(t);
    }

    @Test
    void create_throwsWhenAdvanceExceedsEstimatedCost() {
        UUID customerId = UUID.randomUUID();
        User admin = new User();
        admin.setId(UUID.randomUUID());
        admin.setRole(UserRole.ADMIN);

        when(securityUtils.getCurrentUser()).thenReturn(admin);

        var request = new TicketDto.CreateTicketRequest(
                customerId, DeviceType.MOBILE, "Apple", "iPhone 14", "Blue", null,
                null, null, "Broken glass", new BigDecimal("100.00"), new BigDecimal("200.00"), null);

        BadRequestException ex = assertThrows(BadRequestException.class, () -> ticketService.create(request));
        assertEquals("Advance payment (₹200.00) cannot exceed estimated cost (₹100.00)", ex.getMessage());
    }

    @Test
    void updateEstimation_throwsWhenEstimatedCostLessThanAdvance() {
        RepairTicket t = sampleTicket();
        t.setEstimatedCost(new BigDecimal("500.00"));
        t.setAdvancePaid(new BigDecimal("200.00"));
        t.setBalanceAmount(new BigDecimal("300.00"));

        when(ticketRepository.findByIdWithDetails(ticketId)).thenReturn(Optional.of(t));

        var request = new TicketDto.UpdateEstimationRequest(new BigDecimal("100.00"), "Lowered estimate");

        BadRequestException ex = assertThrows(BadRequestException.class, () -> ticketService.updateEstimation(ticketId, request));
        assertEquals("Estimated cost (₹100.00) cannot be less than advance already collected (₹200.00)", ex.getMessage());
    }

    private RepairTicket sampleTicket() {
        Customer customer = new Customer();
        customer.setId(UUID.randomUUID());
        customer.setCustomerCode("FM-C100");
        customer.setFullName("Test Customer");
        customer.setMobile("9000000099");
        customer.setCreatedAt(Instant.now());

        RepairTicket t = new RepairTicket();
        t.setId(ticketId);
        t.setTrackingNumber("FM260099");
        t.setCustomer(customer);
        t.setStatus(RepairStatus.DEVICE_RECEIVED);
        t.setDeviceType(DeviceType.MOBILE);
        t.setEstimatedCost(BigDecimal.ZERO);
        t.setAdvancePaid(BigDecimal.ZERO);
        t.setBalanceAmount(BigDecimal.ZERO);
        t.setCreatedAt(Instant.now());
        return t;
    }
}
