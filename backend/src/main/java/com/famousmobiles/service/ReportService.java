package com.famousmobiles.service;

import java.awt.Color;
import java.io.ByteArrayOutputStream;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.UUID;

import org.apache.poi.ss.usermodel.BorderStyle;
import org.apache.poi.ss.usermodel.CellStyle;
import org.apache.poi.ss.usermodel.FillPatternType;
import org.apache.poi.ss.usermodel.IndexedColors;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.famousmobiles.domain.AccessorySale;
import com.famousmobiles.domain.RepairTicket;
import com.famousmobiles.domain.enums.RepairStatus;
import com.famousmobiles.dto.MiscDto;
import com.famousmobiles.repository.AccessorySaleRepository;
import com.famousmobiles.repository.InventoryItemRepository;
import com.famousmobiles.repository.PaymentRepository;
import com.famousmobiles.repository.RepairTicketRepository;
import com.lowagie.text.Document;
import com.lowagie.text.Element;
import com.lowagie.text.Font;
import com.lowagie.text.FontFactory;
import com.lowagie.text.PageSize;
import com.lowagie.text.Paragraph;
import com.lowagie.text.Phrase;
import com.lowagie.text.pdf.PdfPCell;
import com.lowagie.text.pdf.PdfPTable;
import com.lowagie.text.pdf.PdfWriter;

@Service
@Transactional(readOnly = true)
public class ReportService {

    private final RepairTicketRepository ticketRepository;
    private final PaymentRepository paymentRepository;
    private final InventoryItemRepository inventoryItemRepository;
    private final AccessorySaleRepository accessorySaleRepository;

    private static final DateTimeFormatter DATE_FMT = DateTimeFormatter.ofPattern("dd MMM yyyy").withZone(ZoneId.of("Asia/Kolkata"));

    public ReportService(
            RepairTicketRepository ticketRepository,
            PaymentRepository paymentRepository,
            InventoryItemRepository inventoryItemRepository,
            AccessorySaleRepository accessorySaleRepository) {
        this.ticketRepository = ticketRepository;
        this.paymentRepository = paymentRepository;
        this.inventoryItemRepository = inventoryItemRepository;
        this.accessorySaleRepository = accessorySaleRepository;
    }

    public List<RepairTicket> repairReport(LocalDate from, LocalDate to, RepairStatus status, UUID storeId) {
        Instant fromInstant = from.atStartOfDay().toInstant(ZoneOffset.UTC);
        Instant toInstant = to.plusDays(1).atStartOfDay().toInstant(ZoneOffset.UTC);
        return ticketRepository.findForReport(fromInstant, toInstant, status, storeId);
    }

    public MiscDto.ReportSummary getReportSummary(LocalDate from, LocalDate to, RepairStatus status, UUID storeId) {
        List<RepairTicket> tickets = repairReport(from, to, status, storeId);
        long delivered = tickets.stream().filter(t -> t.getStatus() == RepairStatus.DELIVERED).count();
        long ready = tickets.stream().filter(t -> t.getStatus() == RepairStatus.READY_FOR_PICKUP).count();
        long inProgress = tickets.size() - delivered - ready;
        BigDecimal cost = tickets.stream().map(t -> t.getEstimatedCost() != null ? t.getEstimatedCost() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal advance = tickets.stream().map(t -> t.getAdvancePaid() != null ? t.getAdvancePaid() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal balance = tickets.stream().map(t -> t.getBalanceAmount() != null ? t.getBalanceAmount() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        return new MiscDto.ReportSummary(tickets.size(), delivered, inProgress, ready, cost, advance, balance);
    }

    public byte[] exportRepairsPdf(LocalDate from, LocalDate to, RepairStatus status, UUID storeId) throws Exception {
        List<RepairTicket> tickets = repairReport(from, to, status, storeId);

        Document document = new Document(PageSize.A4.rotate(), 20, 20, 20, 20);
        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        PdfWriter.getInstance(document, baos);
        document.open();

        Font titleFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 14, new Color(18, 18, 18));
        Font subtitleFont = FontFactory.getFont(FontFactory.HELVETICA, 9, new Color(118, 118, 118));
        Font headerFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 8, Color.WHITE);
        Font cellFont = FontFactory.getFont(FontFactory.HELVETICA, 8, new Color(18, 18, 18));
        Font cellBoldFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 8, new Color(18, 18, 18));
        Font dueFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 8, new Color(179, 83, 0));
        Font paidFont = FontFactory.getFont(FontFactory.HELVETICA, 8, new Color(14, 131, 69));

        Paragraph title = new Paragraph("Famous Mobiles - Repair & Service Report", titleFont);
        title.setSpacingAfter(2);
        document.add(title);

        String scopeText = (status != null ? "Status: " + status.name() + " | " : "") +
                "Date Range: " + from.format(DateTimeFormatter.ofPattern("dd MMM yyyy")) + " to " +
                to.format(DateTimeFormatter.ofPattern("dd MMM yyyy")) + " | Total Records: " + tickets.size();
        Paragraph subtitle = new Paragraph(scopeText, subtitleFont);
        subtitle.setSpacingAfter(12);
        document.add(subtitle);

        // 8 Columns: Token, Date, Store, Customer, Device & Issue, Status, Technician, Balance
        PdfPTable table = new PdfPTable(new float[]{13f, 10f, 7f, 17f, 23f, 11f, 10f, 9f});
        table.setWidthPercentage(100f);

        String[] headers = {"Token", "Date", "Branch", "Customer", "Device / Issue", "Status", "Tech", "Balance"};
        for (String h : headers) {
            PdfPCell cell = new PdfPCell(new Phrase(h, headerFont));
            cell.setBackgroundColor(new Color(18, 18, 18));
            cell.setPadding(5);
            cell.setBorderColor(new Color(235, 235, 235));
            cell.setHorizontalAlignment(Element.ALIGN_LEFT);
            table.addCell(cell);
        }

        Color altColor = new Color(247, 247, 248);
        int idx = 0;
        for (RepairTicket t : tickets) {
            Color rowBg = (idx++ % 2 == 0) ? Color.WHITE : altColor;

            // 1. Token
            addTableCell(table, t.getTrackingNumber(), cellBoldFont, rowBg);

            // 2. Date
            String dateStr = t.getCreatedAt() != null ? DATE_FMT.format(t.getCreatedAt()) : "-";
            addTableCell(table, dateStr, cellFont, rowBg);

            // 3. Store Branch
            String storeCode = t.getStore() != null ? t.getStore().getCode() : "FM1";
            addTableCell(table, storeCode, cellFont, rowBg);

            // 4. Customer & Phone
            String custText = (t.getCustomer() != null ? t.getCustomer().getFullName() : "Unknown") +
                    (t.getCustomer() != null && t.getCustomer().getMobile() != null ? "\n" + t.getCustomer().getMobile() : "");
            addTableCell(table, custText, cellFont, rowBg);

            // 5. Device & Issue
            String deviceText = (t.getBrand() != null ? t.getBrand() + " " : "") + (t.getModel() != null ? t.getModel() : t.getDeviceType().name()) +
                    (t.getProblemDescription() != null ? "\nIssue: " + t.getProblemDescription() : "");
            addTableCell(table, deviceText, cellFont, rowBg);

            // 6. Status
            addTableCell(table, t.getStatus() != null ? t.getStatus().name() : "-", cellBoldFont, rowBg);

            // 7. Technician
            String techName = t.getAssignedTechnician() != null ? t.getAssignedTechnician().getName() : "Unassigned";
            addTableCell(table, techName, cellFont, rowBg);

            // 8. Balance
            BigDecimal balance = t.getBalanceAmount() != null ? t.getBalanceAmount() : BigDecimal.ZERO;
            if (balance.compareTo(BigDecimal.ZERO) > 0) {
                addTableCell(table, "Due: " + balance.toPlainString(), dueFont, rowBg);
            } else {
                addTableCell(table, "Paid", paidFont, rowBg);
            }
        }

        document.add(table);
        document.close();
        return baos.toByteArray();
    }

    private void addTableCell(PdfPTable table, String text, Font font, Color bg) {
        PdfPCell cell = new PdfPCell(new Phrase(text != null ? text : "-", font));
        cell.setBackgroundColor(bg);
        cell.setPadding(4.5f);
        cell.setBorderColor(new Color(235, 235, 235));
        table.addCell(cell);
    }

    public byte[] exportRepairsExcel(LocalDate from, LocalDate to, RepairStatus status, UUID storeId) throws Exception {
        List<RepairTicket> tickets = repairReport(from, to, status, storeId);
        try (Workbook workbook = new XSSFWorkbook()) {
            Sheet sheet = workbook.createSheet("Repairs");

            CellStyle headerStyle = workbook.createCellStyle();
            org.apache.poi.ss.usermodel.Font hFont = workbook.createFont();
            hFont.setBold(true);
            hFont.setColor(IndexedColors.BLACK.getIndex());
            headerStyle.setFont(hFont);
            headerStyle.setFillForegroundColor(IndexedColors.GREY_25_PERCENT.getIndex());
            headerStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);
            headerStyle.setBorderBottom(BorderStyle.THIN);

            Row header = sheet.createRow(0);
            String[] cols = {
                    "Tracking #", "Branch", "Date", "Customer Name", "Customer Mobile",
                    "Brand", "Model", "Device Type", "Problem Description", "Status",
                    "Assigned Technician", "Estimated Cost", "Advance Paid", "Balance Due"
            };
            for (int i = 0; i < cols.length; i++) {
                var cell = header.createCell(i);
                cell.setCellValue(cols[i]);
                cell.setCellStyle(headerStyle);
            }

            int rowIdx = 1;
            for (RepairTicket t : tickets) {
                Row row = sheet.createRow(rowIdx++);
                row.createCell(0).setCellValue(t.getTrackingNumber());
                row.createCell(1).setCellValue(t.getStore() != null ? t.getStore().getCode() : "FM1");
                row.createCell(2).setCellValue(t.getCreatedAt() != null ? DATE_FMT.format(t.getCreatedAt()) : "");
                row.createCell(3).setCellValue(t.getCustomer() != null ? t.getCustomer().getFullName() : "");
                row.createCell(4).setCellValue(t.getCustomer() != null ? t.getCustomer().getMobile() : "");
                row.createCell(5).setCellValue(t.getBrand() != null ? t.getBrand() : "");
                row.createCell(6).setCellValue(t.getModel() != null ? t.getModel() : "");
                row.createCell(7).setCellValue(t.getDeviceType() != null ? t.getDeviceType().name() : "");
                row.createCell(8).setCellValue(t.getProblemDescription() != null ? t.getProblemDescription() : "");
                row.createCell(9).setCellValue(t.getStatus() != null ? t.getStatus().name() : "");
                row.createCell(10).setCellValue(t.getAssignedTechnician() != null ? t.getAssignedTechnician().getName() : "Unassigned");
                row.createCell(11).setCellValue(t.getEstimatedCost() != null ? t.getEstimatedCost().doubleValue() : 0.0);
                row.createCell(12).setCellValue(t.getAdvancePaid() != null ? t.getAdvancePaid().doubleValue() : 0.0);
                row.createCell(13).setCellValue(t.getBalanceAmount() != null ? t.getBalanceAmount().doubleValue() : 0.0);
            }

            for (int i = 0; i < cols.length; i++) {
                sheet.autoSizeColumn(i);
            }

            ByteArrayOutputStream baos = new ByteArrayOutputStream();
            workbook.write(baos);
            return baos.toByteArray();
        }
    }

    public byte[] exportInventoryExcel() throws Exception {
        try (Workbook workbook = new XSSFWorkbook()) {
            Sheet sheet = workbook.createSheet("Inventory");

            CellStyle headerStyle = workbook.createCellStyle();
            org.apache.poi.ss.usermodel.Font hFont = workbook.createFont();
            hFont.setBold(true);
            headerStyle.setFont(hFont);
            headerStyle.setFillForegroundColor(IndexedColors.GREY_25_PERCENT.getIndex());
            headerStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);
            headerStyle.setBorderBottom(BorderStyle.THIN);

            Row header = sheet.createRow(0);
            String[] cols = {"Part Name", "SKU", "In-Stock Quantity", "Cost Price", "Selling Price", "Low Stock"};
            for (int i = 0; i < cols.length; i++) {
                var cell = header.createCell(i);
                cell.setCellValue(cols[i]);
                cell.setCellStyle(headerStyle);
            }

            int rowIdx = 1;
            for (var item : inventoryItemRepository.findAll()) {
                Row row = sheet.createRow(rowIdx++);
                row.createCell(0).setCellValue(item.getPartName());
                row.createCell(1).setCellValue(item.getSku());
                row.createCell(2).setCellValue(item.getQuantity());
                row.createCell(3).setCellValue(item.getCostPrice() != null ? item.getCostPrice().doubleValue() : 0.0);
                row.createCell(4).setCellValue(item.getSellingPrice() != null ? item.getSellingPrice().doubleValue() : 0.0);
                row.createCell(5).setCellValue(item.isLowStock() ? "YES" : "NO");
            }

            for (int i = 0; i < cols.length; i++) {
                sheet.autoSizeColumn(i);
            }

            ByteArrayOutputStream baos = new ByteArrayOutputStream();
            workbook.write(baos);
            return baos.toByteArray();
        }
    }

    public List<AccessorySale> accessorySalesReport(LocalDate from, LocalDate to, UUID storeId) {
        Instant fromInstant = from.atStartOfDay(ZoneId.of("Asia/Kolkata")).toInstant();
        Instant toInstant = to.plusDays(1).atStartOfDay(ZoneId.of("Asia/Kolkata")).toInstant();
        return accessorySaleRepository.findSalesBetweenWithDetails(fromInstant, toInstant, storeId);
    }

    public MiscDto.AccessorySalesReportSummary getAccessorySalesSummary(LocalDate from, LocalDate to, UUID storeId) {
        List<AccessorySale> sales = accessorySalesReport(from, to, storeId);
        List<AccessorySale> active = sales.stream()
                .filter(s -> !"CANCELLED".equalsIgnoreCase(s.getStatus()))
                .toList();

        BigDecimal totalRevenue = BigDecimal.ZERO;
        BigDecimal cashTotal = BigDecimal.ZERO;
        BigDecimal upiTotal = BigDecimal.ZERO;
        BigDecimal cardTotal = BigDecimal.ZERO;

        for (AccessorySale s : active) {
            BigDecimal price = s.getPrice() != null ? s.getPrice() : BigDecimal.ZERO;
            totalRevenue = totalRevenue.add(price);
            String mode = s.getPaymentMode() != null ? s.getPaymentMode().trim().toUpperCase() : "UPI";
            if ("CASH".equals(mode)) {
                cashTotal = cashTotal.add(price);
            } else if ("CARD".equals(mode)) {
                cardTotal = cardTotal.add(price);
            } else {
                upiTotal = upiTotal.add(price);
            }
        }

        return new MiscDto.AccessorySalesReportSummary(active.size(), totalRevenue, cashTotal, upiTotal, cardTotal);
    }

    public byte[] exportAccessorySalesPdf(LocalDate from, LocalDate to, UUID storeId) throws Exception {
        List<AccessorySale> sales = accessorySalesReport(from, to, storeId);

        Document document = new Document(PageSize.A4.rotate(), 20, 20, 20, 20);
        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        PdfWriter.getInstance(document, baos);
        document.open();

        Font titleFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 14, new Color(18, 18, 18));
        Font subtitleFont = FontFactory.getFont(FontFactory.HELVETICA, 9, new Color(118, 118, 118));
        Font headerFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 8, Color.WHITE);
        Font cellFont = FontFactory.getFont(FontFactory.HELVETICA, 8, new Color(18, 18, 18));
        Font cellBoldFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 8, new Color(18, 18, 18));
        Font cancelledFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 8, new Color(179, 38, 30));
        Font activeFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 8, new Color(14, 131, 69));

        Paragraph title = new Paragraph("Famous Mobiles - Accessory Sales & Invoices Report", titleFont);
        title.setSpacingAfter(2);
        document.add(title);

        String scopeText = "Date Range: " + from.format(DateTimeFormatter.ofPattern("dd MMM yyyy")) + " to " +
                to.format(DateTimeFormatter.ofPattern("dd MMM yyyy")) + " | Generated on: " +
                LocalDate.now().format(DateTimeFormatter.ofPattern("dd MMM yyyy"));
        Paragraph subtitle = new Paragraph(scopeText, subtitleFont);
        subtitle.setSpacingAfter(10);
        document.add(subtitle);

        // Compute active totals
        BigDecimal totalActiveAmt = sales.stream()
                .filter(s -> !"CANCELLED".equalsIgnoreCase(s.getStatus()))
                .map(s -> s.getPrice() != null ? s.getPrice() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        long activeCount = sales.stream().filter(s -> !"CANCELLED".equalsIgnoreCase(s.getStatus())).count();
        long voidCount = sales.size() - activeCount;

        Paragraph kpiSummary = new Paragraph(
                "Total Items Sold: " + activeCount + (voidCount > 0 ? " (" + voidCount + " voided)" : "") +
                "  |  Total Sales Revenue: INR " + totalActiveAmt.toPlainString(),
                cellBoldFont
        );
        kpiSummary.setSpacingAfter(8);
        document.add(kpiSummary);

        PdfPTable table = new PdfPTable(new float[]{4f, 13f, 12f, 13f, 10f, 18f, 9f, 9f, 9f, 8f});
        table.setWidthPercentage(100);

        String[] headers = {"#", "Bill No", "Date / Time", "Customer", "Mobile", "Accessory Item", "Warranty", "Mode", "Price", "Status"};
        for (String h : headers) {
            PdfPCell cell = new PdfPCell(new Phrase(h, headerFont));
            cell.setBackgroundColor(new Color(18, 18, 18));
            cell.setPadding(5f);
            cell.setBorder(0);
            table.addCell(cell);
        }

        DateTimeFormatter dtf = DateTimeFormatter.ofPattern("dd MMM yyyy, hh:mm a").withZone(ZoneId.of("Asia/Kolkata"));
        int idx = 1;
        for (AccessorySale s : sales) {
            Color rowBg = (idx % 2 == 0) ? new Color(247, 247, 248) : Color.WHITE;
            boolean isCancelled = "CANCELLED".equalsIgnoreCase(s.getStatus());

            addTableCell(table, String.valueOf(idx++), cellFont, rowBg);
            addTableCell(table, s.getBillNumber(), cellBoldFont, rowBg);
            addTableCell(table, s.getSoldAt() != null ? dtf.format(s.getSoldAt()) : "-", cellFont, rowBg);
            addTableCell(table, s.getCustomerName(), cellFont, rowBg);
            addTableCell(table, s.getCustomerMobile(), cellFont, rowBg);
            addTableCell(table, s.getAccessoryName(), cellFont, rowBg);
            addTableCell(table, s.getWarrantyMonths() != null && s.getWarrantyMonths() > 0 ? s.getWarrantyMonths() + " Mo" : "None", cellFont, rowBg);
            addTableCell(table, s.getPaymentMode() != null ? s.getPaymentMode() : "UPI", cellFont, rowBg);
            addTableCell(table, "INR " + (s.getPrice() != null ? s.getPrice().toPlainString() : "0"), cellBoldFont, rowBg);
            addTableCell(table, isCancelled ? "VOID" : "PAID", isCancelled ? cancelledFont : activeFont, rowBg);
        }

        document.add(table);
        document.close();
        return baos.toByteArray();
    }

    public byte[] exportAccessorySalesExcel(LocalDate from, LocalDate to, UUID storeId) throws Exception {
        List<AccessorySale> sales = accessorySalesReport(from, to, storeId);

        try (Workbook workbook = new XSSFWorkbook()) {
            Sheet sheet = workbook.createSheet("Accessory Sales");

            CellStyle headerStyle = workbook.createCellStyle();
            org.apache.poi.ss.usermodel.Font hFont = workbook.createFont();
            hFont.setBold(true);
            headerStyle.setFont(hFont);
            headerStyle.setFillForegroundColor(IndexedColors.GREY_25_PERCENT.getIndex());
            headerStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);
            headerStyle.setBorderBottom(BorderStyle.THIN);

            Row header = sheet.createRow(0);
            String[] cols = {"#", "Bill Number", "Date / Time", "Customer Name", "Customer Mobile", "Accessory Item", "Serial / IMEI", "Warranty (Months)", "Payment Mode", "Price (INR)", "Status", "Sold By"};
            for (int i = 0; i < cols.length; i++) {
                var cell = header.createCell(i);
                cell.setCellValue(cols[i]);
                cell.setCellStyle(headerStyle);
            }

            DateTimeFormatter dtf = DateTimeFormatter.ofPattern("dd-MMM-yyyy HH:mm").withZone(ZoneId.of("Asia/Kolkata"));
            int rowIdx = 1;
            for (AccessorySale s : sales) {
                Row row = sheet.createRow(rowIdx++);
                row.createCell(0).setCellValue(rowIdx - 1);
                row.createCell(1).setCellValue(s.getBillNumber());
                row.createCell(2).setCellValue(s.getSoldAt() != null ? dtf.format(s.getSoldAt()) : "");
                row.createCell(3).setCellValue(s.getCustomerName());
                row.createCell(4).setCellValue(s.getCustomerMobile());
                row.createCell(5).setCellValue(s.getAccessoryName());
                row.createCell(6).setCellValue(s.getSerialNumber() != null ? s.getSerialNumber() : "");
                row.createCell(7).setCellValue(s.getWarrantyMonths() != null ? s.getWarrantyMonths() : 0);
                row.createCell(8).setCellValue(s.getPaymentMode() != null ? s.getPaymentMode() : "UPI");
                row.createCell(9).setCellValue(s.getPrice() != null ? s.getPrice().doubleValue() : 0.0);
                row.createCell(10).setCellValue(s.getStatus() != null ? s.getStatus() : "COMPLETED");
                row.createCell(11).setCellValue(s.getSoldBy() != null ? s.getSoldBy().getFullName() : "");
            }

            for (int i = 0; i < cols.length; i++) {
                sheet.autoSizeColumn(i);
            }

            ByteArrayOutputStream baos = new ByteArrayOutputStream();
            workbook.write(baos);
            return baos.toByteArray();
        }
    }
}
