package com.famousmobiles;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;
import java.nio.file.Path;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.api.io.TempDir;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.famousmobiles.config.AppProperties;
import com.famousmobiles.domain.AccessorySale;
import com.famousmobiles.domain.Customer;
import com.famousmobiles.domain.RepairTicket;
import com.famousmobiles.domain.enums.DeviceType;
import com.famousmobiles.domain.enums.RepairStatus;
import com.famousmobiles.service.FileStorageService;
import com.famousmobiles.service.PdfReceiptService;
import com.lowagie.text.PageSize;
import com.lowagie.text.pdf.PdfReader;

@ExtendWith(MockitoExtension.class)
class PdfReceiptServiceTest {

    @Mock
    private AppProperties appProperties;

    @Mock
    private FileStorageService fileStorageService;

    @TempDir
    Path tempDir;

    private PdfReceiptService pdfReceiptService;

    @BeforeEach
    void setUp() {
        pdfReceiptService = new PdfReceiptService(appProperties, fileStorageService);
    }

    private RepairTicket createSampleTicket() {
        Customer customer = new Customer();
        customer.setId(UUID.randomUUID());
        customer.setCustomerCode("CUST-1001");
        customer.setFullName("Mohammed Basheer");
        customer.setMobile("9876543210");
        customer.setCreatedAt(Instant.now());

        RepairTicket ticket = new RepairTicket();
        ticket.setId(UUID.randomUUID());
        ticket.setTrackingNumber("TRK-TEST01");
        ticket.setCustomer(customer);
        ticket.setDeviceType(DeviceType.MOBILE);
        ticket.setBrand("Samsung");
        ticket.setModel("Galaxy S23");
        ticket.setColor("Phantom Black");
        ticket.setImei("352099001761482");
        ticket.setAccessoriesReceived(List.of("Back Cover", "SIM Tray"));
        ticket.setProblemDescription("Screen cracked, display flickering, needs urgent original AMOLED replacement");
        ticket.setEstimatedCost(new BigDecimal("3500.00"));
        ticket.setAdvancePaid(new BigDecimal("1000.00"));
        ticket.setBalanceAmount(new BigDecimal("2500.00"));
        ticket.setStatus(RepairStatus.DEVICE_RECEIVED);
        ticket.setCreatedAt(Instant.now());
        return ticket;
    }

    @Test
    void generateReceipt_shouldProduceCustomerCopyOnlyOnA4TopHalf() throws Exception {
        when(appProperties.shop()).thenReturn(null);

        Path receiptFile = tempDir.resolve("TRK-TEST01.pdf");
        when(fileStorageService.getReceiptPath(anyString())).thenReturn(receiptFile);

        RepairTicket ticket = createSampleTicket();

        // By default, generates Customer Copy only on the top half
        byte[] pdfBytes = pdfReceiptService.generateReceipt(ticket);

        assertNotNull(pdfBytes);
        assertTrue(pdfBytes.length > 0);

        PdfReader reader = new PdfReader(pdfBytes);

        // Standard A4 sheet dimensions
        assertEquals(PageSize.A4.getWidth(), reader.getPageSize(1).getWidth(), 0.5f, "Width should match A4");
        assertEquals(PageSize.A4.getHeight(), reader.getPageSize(1).getHeight(), 0.5f, "Height should match A4");

        // Receipt fits cleanly on a single page
        assertEquals(1, reader.getNumberOfPages(), "Customer Copy must fit on a single A4 page without page overflow");

        byte[] pageContent = reader.getPageContent(1);
        String contentString = new String(pageContent);
        assertTrue(!contentString.contains("CUT HERE"), "PDF should not contain CUT HERE cut guide");
        assertTrue(!contentString.contains("Customer Sign"), "PDF should not contain Customer Sign");
        assertTrue(contentString.contains("Authorized Sign"), "PDF should retain Authorized Sign");
        assertTrue(contentString.contains("Md. Basheer Uddin"), "PDF should have digital sign of Md. Basheer Uddin");
        assertTrue(contentString.contains("Digitally Signed"), "PDF should indicate digitally signed bill");
    }

    @Test
    void generateReceipt_duplicateOption_shouldFitBothCopiesOnSingleA4Page() throws Exception {
        when(appProperties.shop()).thenReturn(null);

        Path receiptFile = tempDir.resolve("TRK-TEST02.pdf");
        when(fileStorageService.getReceiptPath(anyString())).thenReturn(receiptFile);

        RepairTicket ticket = createSampleTicket();

        // With duplicate=true, both Customer Copy and Shop Copy are rendered on the same sheet
        byte[] pdfBytes = pdfReceiptService.generateReceipt(ticket, true);

        assertNotNull(pdfBytes);
        assertTrue(pdfBytes.length > 0);

        PdfReader reader = new PdfReader(pdfBytes);

        assertEquals(PageSize.A4.getWidth(), reader.getPageSize(1).getWidth(), 0.5f);
        assertEquals(PageSize.A4.getHeight(), reader.getPageSize(1).getHeight(), 0.5f);
        assertEquals(1, reader.getNumberOfPages(), "Both copies must cleanly fit on a single A4 sheet without overflow");
    }

    @Test
    void generateAccessoryWarrantyBill_shouldProduceValidA4TopHalfPdf() throws Exception {
        when(appProperties.shop()).thenReturn(null);

        Path receiptFile = tempDir.resolve("FM-ACC-TEST01.pdf");
        when(fileStorageService.getReceiptPath(anyString())).thenReturn(receiptFile);

        AccessorySale sale = new AccessorySale();
        sale.setId(UUID.randomUUID());
        sale.setBillNumber("FM-ACC-2026-00001");
        sale.setCustomerName("Rahul Sharma");
        sale.setCustomerMobile("9876543210");
        sale.setAccessoryName("Boat Airdopes 141 ANC");
        sale.setPrice(new BigDecimal("1499.00"));
        sale.setPaymentMode("UPI");
        sale.setWarrantyMonths(6);
        sale.setWarrantyExpiresAt(LocalDate.now().plusMonths(6));
        sale.setSerialNumber("SN-BOAT-99218");
        sale.setSoldAt(Instant.now());

        byte[] pdfBytes = pdfReceiptService.generateAccessoryWarrantyBill(sale, false);

        assertNotNull(pdfBytes);
        assertTrue(pdfBytes.length > 0);

        PdfReader reader = new PdfReader(pdfBytes);
        assertEquals(1, reader.getNumberOfPages(), "Accessory bill must fit on a single page");
        assertEquals(PageSize.A4.getWidth(), reader.getPageSize(1).getWidth(), 0.5f);
        assertEquals(PageSize.A4.getHeight(), reader.getPageSize(1).getHeight(), 0.5f);

        byte[] pageContent = reader.getPageContent(1);
        String contentString = new String(pageContent);
        assertTrue(contentString.contains("ACCESSORY SALE & WARRANTY BILL"), "Should have warranty bill title");
        assertTrue(contentString.contains("Replacement Warranty"), "Should have warranty text");
        assertTrue(contentString.contains("Md. Basheer Uddin"), "Accessory bill should contain digital sign of Md. Basheer Uddin");
        assertTrue(contentString.contains("Digitally Signed"), "Accessory bill should indicate digitally signed bill");
    }

    @Test
    void generateAccessoryWarrantyBill_zeroWarranty_shouldProduceInvoiceWithoutWarrantyRow() throws Exception {
        when(appProperties.shop()).thenReturn(null);

        Path receiptFile = tempDir.resolve("FM-ACC-TEST02.pdf");
        when(fileStorageService.getReceiptPath(anyString())).thenReturn(receiptFile);

        AccessorySale sale = new AccessorySale();
        sale.setId(UUID.randomUUID());
        sale.setBillNumber("FM-ACC-2026-00002");
        sale.setCustomerName("Aamer Khan");
        sale.setCustomerMobile("9123456789");
        sale.setAccessoryName("Tempered Glass");
        sale.setPrice(new BigDecimal("150.00"));
        sale.setPaymentMode("UPI");
        sale.setWarrantyMonths(0);
        sale.setWarrantyExpiresAt(null);
        sale.setSoldAt(Instant.now());

        byte[] pdfBytes = pdfReceiptService.generateAccessoryWarrantyBill(sale, false);

        assertNotNull(pdfBytes);
        assertTrue(pdfBytes.length > 0);

        PdfReader reader = new PdfReader(pdfBytes);
        assertEquals(1, reader.getNumberOfPages(), "Accessory bill must fit on a single page");

        byte[] pageContent = reader.getPageContent(1);
        String contentString = new String(pageContent);
        assertTrue(contentString.contains("ACCESSORY SALE INVOICE"), "Should have invoice title when warranty is 0");
        assertTrue(!contentString.contains("ACCESSORY SALE & WARRANTY BILL"), "Should not have warranty bill title");
        assertTrue(!contentString.contains("Replacement Warranty"), "Should not mention replacement warranty");
    }
}
