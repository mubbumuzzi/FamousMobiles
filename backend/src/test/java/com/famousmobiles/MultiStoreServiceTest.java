package com.famousmobiles;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.famousmobiles.config.AppProperties;
import com.famousmobiles.config.ShopInfo;
import com.famousmobiles.domain.Customer;
import com.famousmobiles.domain.RepairTicket;
import com.famousmobiles.domain.Store;
import com.famousmobiles.domain.User;
import com.famousmobiles.domain.enums.DeviceType;
import com.famousmobiles.domain.enums.RepairStatus;
import com.famousmobiles.domain.enums.UserRole;
import com.famousmobiles.dto.TicketDto;
import com.famousmobiles.repository.DevicePhotoRepository;
import com.famousmobiles.repository.PaymentRepository;
import com.famousmobiles.repository.RepairTicketRepository;
import com.famousmobiles.repository.StoreRepository;
import com.famousmobiles.repository.TechnicianRepository;
import com.famousmobiles.repository.TicketNoteRepository;
import com.famousmobiles.repository.TicketStatusHistoryRepository;
import com.famousmobiles.security.SecurityUtils;
import com.famousmobiles.service.CustomerService;
import com.famousmobiles.service.DashboardService;
import com.famousmobiles.service.FileStorageService;
import com.famousmobiles.service.NotificationService;
import com.famousmobiles.service.TicketService;
import com.famousmobiles.service.TrackingNumberService;

@ExtendWith(MockitoExtension.class)
public class MultiStoreServiceTest {

    @Mock private RepairTicketRepository ticketRepository;
    @Mock private TicketStatusHistoryRepository statusHistoryRepository;
    @Mock private TicketNoteRepository noteRepository;
    @Mock private DevicePhotoRepository photoRepository;
    @Mock private CustomerService customerService;
    @Mock private TechnicianRepository technicianRepository;
    @Mock private TrackingNumberService trackingNumberService;
    @Mock private NotificationService notificationService;
    @Mock private FileStorageService fileStorageService;
    @Mock private PaymentRepository paymentRepository;
    @Mock private SecurityUtils securityUtils;
    @Mock private StoreRepository storeRepository;

    private TicketService ticketService;
    private DashboardService dashboardService;

    private Store store1;
    private Store store2;
    private User adminUser;

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
                securityUtils,
                storeRepository
        );

        dashboardService = new DashboardService(ticketRepository, paymentRepository);

        store1 = new Store();
        store1.setId(UUID.randomUUID());
        store1.setCode("FM1");
        store1.setName("Famous Mobiles (Main Branch - Manikonda)");
        store1.setDisplayName("Manikonda Branch");
        store1.setMobile("9063786751");
        store1.setOwnerName("Basheer Uddin");
        store1.setAddressLine1("Opp Friends Colony Bus Stop");
        store1.setCity("Hyderabad");

        store2 = new Store();
        store2.setId(UUID.randomUUID());
        store2.setCode("FM2");
        store2.setName("Famous Mobiles (Shaikpet Branch)");
        store2.setDisplayName("Shaikpet");
        store2.setMobile("9876543210");
        store2.setOwnerName("Basheer Uddin");
        store2.setAddressLine1("Shaikpet Main Road");
        store2.setCity("Hyderabad");

        adminUser = new User();
        adminUser.setId(UUID.randomUUID());
        adminUser.setRole(UserRole.ADMIN);
        adminUser.setFullName("Admin User");
    }

    @Test
    void createTicket_assignsStore2WhenStoreIdProvided() {
        UUID customerId = UUID.randomUUID();
        Customer customer = new Customer();
        customer.setId(customerId);
        customer.setCustomerCode("FM-C001");
        customer.setFullName("Test Customer");

        when(securityUtils.getCurrentUser()).thenReturn(adminUser);
        when(customerService.getEntity(customerId)).thenReturn(customer);
        when(storeRepository.findById(store2.getId())).thenReturn(Optional.of(store2));
        when(trackingNumberService.generateTrackingNumber("FM2")).thenReturn("FM2-2026-000001");
        when(ticketRepository.save(any(RepairTicket.class))).thenAnswer(i -> {
            RepairTicket t = i.getArgument(0);
            t.setId(UUID.randomUUID());
            t.setCreatedAt(Instant.now());
            return t;
        });

        var request = new TicketDto.CreateTicketRequest(
                customerId, DeviceType.MOBILE, "OnePlus", "11R", "Black", null,
                null, null, "Display replacement", new BigDecimal("4500"), BigDecimal.ZERO, null,
                null, store2.getId());

        var response = ticketService.create(request);

        assertNotNull(response);
        assertEquals("FM2-2026-000001", response.trackingNumber());
        assertNotNull(response.store());
        assertEquals("FM2", response.store().code());
        assertEquals("Shaikpet", response.store().displayName());
    }

    @Test
    void shopInfoResolve_usesStoreSpecificBranding() {
        ShopInfo.Resolved resolvedStore2 = ShopInfo.resolve(store2, null);
        assertEquals("Famous Mobiles (Shaikpet Branch)", resolvedStore2.name());
        assertEquals("9876543210", resolvedStore2.mobile());
        assertTrue(resolvedStore2.addressLines().contains("Shaikpet Main Road"));
    }

    @Test
    void dashboardMetrics_filtersByStoreId() {
        RepairTicket t1 = new RepairTicket();
        t1.setId(UUID.randomUUID());
        t1.setStore(store1);
        t1.setStatus(RepairStatus.DEVICE_RECEIVED);
        t1.setCreatedAt(Instant.now());

        RepairTicket t2 = new RepairTicket();
        t2.setId(UUID.randomUUID());
        t2.setStore(store2);
        t2.setStatus(RepairStatus.DEVICE_RECEIVED);
        t2.setCreatedAt(Instant.now());

        when(ticketRepository.findAll()).thenReturn(List.of(t1, t2));
        when(paymentRepository.findAll()).thenReturn(List.of());

        var metricsStore1 = dashboardService.getMetrics(true, store1.getId());
        assertEquals(1, metricsStore1.devicesReceivedToday());

        var metricsStore2 = dashboardService.getMetrics(true, store2.getId());
        assertEquals(1, metricsStore2.devicesReceivedToday());
    }
}
