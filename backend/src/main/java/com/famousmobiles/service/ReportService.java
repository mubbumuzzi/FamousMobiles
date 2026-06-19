package com.famousmobiles.service;

import java.io.ByteArrayOutputStream;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.List;

import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;

import com.famousmobiles.domain.RepairTicket;
import com.famousmobiles.domain.enums.RepairStatus;
import com.famousmobiles.repository.InventoryItemRepository;
import com.famousmobiles.repository.PaymentRepository;
import com.famousmobiles.repository.RepairTicketRepository;
import com.lowagie.text.Document;
import com.lowagie.text.Font;
import com.lowagie.text.FontFactory;
import com.lowagie.text.Paragraph;
import com.lowagie.text.pdf.PdfWriter;

@Service
public class ReportService {

    private final RepairTicketRepository ticketRepository;
    private final PaymentRepository paymentRepository;
    private final InventoryItemRepository inventoryItemRepository;

    public ReportService(RepairTicketRepository ticketRepository, PaymentRepository paymentRepository,
            InventoryItemRepository inventoryItemRepository) {
        this.ticketRepository = ticketRepository;
        this.paymentRepository = paymentRepository;
        this.inventoryItemRepository = inventoryItemRepository;
    }

    public List<RepairTicket> repairReport(LocalDate from, LocalDate to, RepairStatus status) {
        Instant fromInstant = from.atStartOfDay().toInstant(ZoneOffset.UTC);
        Instant toInstant = to.plusDays(1).atStartOfDay().toInstant(ZoneOffset.UTC);
        return ticketRepository.findAll().stream()
                .filter(t -> !t.getCreatedAt().isBefore(fromInstant) && t.getCreatedAt().isBefore(toInstant))
                .filter(t -> status == null || t.getStatus() == status)
                .toList();
    }

    public byte[] exportRepairsPdf(LocalDate from, LocalDate to, RepairStatus status) throws Exception {
        List<RepairTicket> tickets = repairReport(from, to, status);
        Document document = new Document();
        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        PdfWriter.getInstance(document, baos);
        document.open();
        Font font = FontFactory.getFont(FontFactory.HELVETICA, 10);
        document.add(new Paragraph("Repair Report " + from + " to " + to, font));
        for (RepairTicket t : tickets) {
            document.add(new Paragraph(t.getTrackingNumber() + " | " + t.getStatus() + " | "
                    + t.getBrand() + " " + t.getModel(), font));
        }
        document.close();
        return baos.toByteArray();
    }

    public byte[] exportRepairsExcel(LocalDate from, LocalDate to, RepairStatus status) throws Exception {
        List<RepairTicket> tickets = repairReport(from, to, status);
        try (Workbook workbook = new XSSFWorkbook()) {
            Sheet sheet = workbook.createSheet("Repairs");
            Row header = sheet.createRow(0);
            header.createCell(0).setCellValue("Tracking");
            header.createCell(1).setCellValue("Status");
            header.createCell(2).setCellValue("Device");
            header.createCell(3).setCellValue("Customer");
            int rowIdx = 1;
            for (RepairTicket t : tickets) {
                Row row = sheet.createRow(rowIdx++);
                row.createCell(0).setCellValue(t.getTrackingNumber());
                row.createCell(1).setCellValue(t.getStatus().name());
                row.createCell(2).setCellValue(t.getBrand() + " " + t.getModel());
                row.createCell(3).setCellValue(t.getCustomer().getFullName());
            }
            ByteArrayOutputStream baos = new ByteArrayOutputStream();
            workbook.write(baos);
            return baos.toByteArray();
        }
    }

    public byte[] exportInventoryExcel() throws Exception {
        try (Workbook workbook = new XSSFWorkbook()) {
            Sheet sheet = workbook.createSheet("Inventory");
            Row header = sheet.createRow(0);
            header.createCell(0).setCellValue("Part");
            header.createCell(1).setCellValue("SKU");
            header.createCell(2).setCellValue("Quantity");
            int rowIdx = 1;
            for (var item : inventoryItemRepository.findAll()) {
                Row row = sheet.createRow(rowIdx++);
                row.createCell(0).setCellValue(item.getPartName());
                row.createCell(1).setCellValue(item.getSku());
                row.createCell(2).setCellValue(item.getQuantity());
            }
            ByteArrayOutputStream baos = new ByteArrayOutputStream();
            workbook.write(baos);
            return baos.toByteArray();
        }
    }
}
