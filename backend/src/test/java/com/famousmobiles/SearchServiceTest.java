package com.famousmobiles;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;

import com.famousmobiles.domain.AccessorySale;
import com.famousmobiles.domain.Customer;
import com.famousmobiles.domain.RepairTicket;
import com.famousmobiles.domain.Store;
import com.famousmobiles.domain.enums.RepairStatus;
import com.famousmobiles.dto.MiscDto;
import com.famousmobiles.repository.AccessorySaleRepository;
import com.famousmobiles.repository.CustomerRepository;
import com.famousmobiles.repository.RepairTicketRepository;
import com.famousmobiles.service.SearchService;

@ExtendWith(MockitoExtension.class)
class SearchServiceTest {

    @Mock
    private RepairTicketRepository ticketRepository;

    @Mock
    private CustomerRepository customerRepository;

    @Mock
    private AccessorySaleRepository accessorySaleRepository;

    @InjectMocks
    private SearchService searchService;

    private Store store1;
    private Store store2;

    @BeforeEach
    void setUp() {
        store1 = new Store();
        store1.setId(UUID.randomUUID());
        store1.setCode("FM1");
        store1.setName("Famous Mobiles Manikonda");

        store2 = new Store();
        store2.setId(UUID.randomUUID());
        store2.setCode("FM2");
        store2.setName("New Famous");
    }

    @Test
    void search_emptyOrBlankQuery_returnsEmptyLists() {
        MiscDto.SearchResult resNull = searchService.search(null);
        assertNotNull(resNull);
        assertTrue(resNull.tickets().isEmpty());
        assertTrue(resNull.customers().isEmpty());
        assertTrue(resNull.accessorySales().isEmpty());

        MiscDto.SearchResult resBlank = searchService.search("   ");
        assertNotNull(resBlank);
        assertTrue(resBlank.tickets().isEmpty());
        assertTrue(resBlank.customers().isEmpty());
        assertTrue(resBlank.accessorySales().isEmpty());
    }

    @Test
    void search_matchingQuery_returnsUnifiedTicketsCustomersAndAccessorySales() {
        String q = "Samsung";

        // Mock Ticket
        Customer customer = new Customer();
        customer.setId(UUID.randomUUID());
        customer.setFullName("Mubasheer");
        customer.setMobile("9063786751");

        RepairTicket ticket = new RepairTicket();
        ticket.setId(UUID.randomUUID());
        ticket.setTrackingNumber("FM1-2026-000001");
        ticket.setCustomer(customer);
        ticket.setStore(store1);
        ticket.setStatus(RepairStatus.DEVICE_RECEIVED);
        ticket.setBrand("Samsung");
        ticket.setModel("Galaxy S23");

        when(ticketRepository.searchWithDetails(q)).thenReturn(List.of(ticket));
        when(customerRepository.search(q)).thenReturn(List.of(customer));

        // Mock Accessory Sale
        AccessorySale sale = new AccessorySale();
        sale.setId(UUID.randomUUID());
        sale.setBillNumber("FM-ACC-2026-00001");
        sale.setAccessoryName("Samsung 25W Type-C Charger");
        sale.setCustomerName("Mubasheer");
        sale.setCustomerMobile("9063786751");
        sale.setPrice(new BigDecimal("150.00"));
        sale.setStore(store1);
        sale.setSoldAt(Instant.now());

        when(accessorySaleRepository.search(eq(q), any(PageRequest.class)))
                .thenReturn(new PageImpl<>(List.of(sale)));

        MiscDto.SearchResult result = searchService.search(q);

        assertNotNull(result);
        assertEquals(1, result.tickets().size());
        assertEquals("FM1-2026-000001", result.tickets().get(0).trackingNumber());

        assertEquals(1, result.customers().size());
        assertEquals("Mubasheer", result.customers().get(0).fullName());

        assertEquals(1, result.accessorySales().size());
        assertEquals("FM-ACC-2026-00001", result.accessorySales().get(0).billNumber());
        assertEquals("Samsung 25W Type-C Charger", result.accessorySales().get(0).accessoryName());
    }

    @Test
    void search_withStoreId_filtersAccessorySalesByStore() {
        String q = "Glass";

        AccessorySale saleStore1 = new AccessorySale();
        saleStore1.setId(UUID.randomUUID());
        saleStore1.setBillNumber("FM-ACC-2026-00005");
        saleStore1.setAccessoryName("UV Curved Glass");
        saleStore1.setCustomerName("Basheer");
        saleStore1.setCustomerMobile("9063786751");
        saleStore1.setPrice(new BigDecimal("100.00"));
        saleStore1.setStore(store1); // Belongs to Store 1

        AccessorySale saleStore2 = new AccessorySale();
        saleStore2.setId(UUID.randomUUID());
        saleStore2.setBillNumber("FM-ACC-2026-00006");
        saleStore2.setAccessoryName("Tempered Glass");
        saleStore2.setCustomerName("Basheer");
        saleStore2.setCustomerMobile("9063786751");
        saleStore2.setPrice(new BigDecimal("120.00"));
        saleStore2.setStore(store2); // Belongs to Store 2

        when(ticketRepository.searchWithDetailsAndStore(q, store1.getId())).thenReturn(List.of());
        when(customerRepository.search(q)).thenReturn(List.of());
        when(accessorySaleRepository.search(eq(q), any(PageRequest.class)))
                .thenReturn(new PageImpl<>(List.of(saleStore1, saleStore2)));

        MiscDto.SearchResult result = searchService.search(q, store1.getId());

        assertNotNull(result);
        // Only saleStore1 should be returned because storeId filter is store1
        assertEquals(1, result.accessorySales().size());
        assertEquals("FM-ACC-2026-00005", result.accessorySales().get(0).billNumber());
    }

    @Test
    void searchResult_twoArgConstructor_defaultsAccessorySalesToEmptyList() {
        MiscDto.SearchResult legacyResult = new MiscDto.SearchResult(List.of(), List.of());
        assertNotNull(legacyResult.tickets());
        assertNotNull(legacyResult.customers());
        assertNotNull(legacyResult.accessorySales());
        assertTrue(legacyResult.accessorySales().isEmpty());
    }
}
