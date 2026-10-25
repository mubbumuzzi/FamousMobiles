package com.famousmobiles.service;

import java.awt.Color;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.math.BigDecimal;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.Locale;

import org.springframework.stereotype.Service;

import com.famousmobiles.config.AppProperties;
import com.famousmobiles.config.ShopInfo;
import com.famousmobiles.domain.RepairTicket;
import com.google.zxing.BarcodeFormat;
import com.google.zxing.client.j2se.MatrixToImageWriter;
import com.google.zxing.common.BitMatrix;
import com.google.zxing.qrcode.QRCodeWriter;
import com.lowagie.text.Document;
import com.lowagie.text.Element;
import com.lowagie.text.Font;
import com.lowagie.text.FontFactory;
import com.lowagie.text.Image;
import com.lowagie.text.PageSize;
import com.lowagie.text.Paragraph;
import com.lowagie.text.Phrase;
import com.lowagie.text.Rectangle;
import com.lowagie.text.pdf.PdfPCell;
import com.lowagie.text.pdf.PdfPTable;
import com.lowagie.text.pdf.PdfWriter;

@Service
public class PdfReceiptService {

    private static final DateTimeFormatter RECEIPT_DATE = DateTimeFormatter
            .ofPattern("dd MMM yyyy, hh:mm a", Locale.ENGLISH)
            .withZone(ZoneId.of("Asia/Kolkata"));

    private static final DateTimeFormatter DATE_ONLY = DateTimeFormatter
            .ofPattern("dd MMM yyyy", Locale.ENGLISH)
            .withZone(ZoneId.of("Asia/Kolkata"));

    private static final DateTimeFormatter LOCAL_DATE_FMT = DateTimeFormatter
            .ofPattern("dd MMM yyyy", Locale.ENGLISH);

    private final AppProperties appProperties;
    private final FileStorageService fileStorageService;

    public PdfReceiptService(AppProperties appProperties, FileStorageService fileStorageService) {
        this.appProperties = appProperties;
        this.fileStorageService = fileStorageService;
    }

    public byte[] generateReceipt(RepairTicket ticket) throws Exception {
        return generateReceipt(ticket, false);
    }

    public byte[] generateReceipt(RepairTicket ticket, boolean duplicate) throws Exception {
        byte[] pdf = buildPdf(ticket, duplicate);
        Path cached = fileStorageService.getReceiptPath(ticket.getTrackingNumber());
        Files.write(cached, pdf);
        return pdf;
    }

    private byte[] buildPdf(RepairTicket ticket, boolean duplicate) throws Exception {
        ShopInfo.Resolved shop = ShopInfo.resolve(appProperties.shop());

        // A4 page (595 x 842 pt) with compact margins so Customer Copy occupies the top half (A5 dimensions: 210mm x 148.5mm)
        Document document = new Document(PageSize.A4, 20f, 20f, 16f, 16f);
        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        PdfWriter.getInstance(document, baos);
        document.open();

        String trackUrl = appProperties.publicAppUrl() + "/track/" + ticket.getTrackingNumber();
        Image qr = Image.getInstance(generateQrBytes(trackUrl));
        qr.scaleAbsolute(46, 46);
        qr.setAlignment(Element.ALIGN_CENTER);

        // 1. Top Half: Customer Copy
        renderReceiptBlock(document, ticket, shop, "CUSTOMER COPY", qr);

        // 2. Only render Shop Copy if duplicate is explicitly requested
        if (duplicate) {
            Paragraph spacer = new Paragraph(" ");
            spacer.setSpacingBefore(16f);
            spacer.setSpacingAfter(8f);
            document.add(spacer);
            renderReceiptBlock(document, ticket, shop, "STORE / OFFICE COPY", qr);
        }

        document.close();
        return baos.toByteArray();
    }

    private void renderReceiptBlock(Document document, RepairTicket ticket, ShopInfo.Resolved shop, String copyLabel, Image qr) throws Exception {
        Font shopTitleFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 12f, new Color(15, 23, 42));
        Font headerTitleFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 10.5f, new Color(30, 41, 59));
        Font badgeFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 7.5f, new Color(71, 85, 105));
        Font boldFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 7.5f, new Color(15, 23, 42));
        Font labelFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 7f, new Color(71, 85, 105));
        Font valueFont = FontFactory.getFont(FontFactory.HELVETICA, 7.5f, new Color(15, 23, 42));
        Font smallFont = FontFactory.getFont(FontFactory.HELVETICA, 6.5f, new Color(100, 116, 139));
        Font noteFont = FontFactory.getFont(FontFactory.HELVETICA_OBLIQUE, 6.5f, new Color(71, 85, 105));

        // Header Table (2 columns: Shop details on left, Receipt metadata on right)
        PdfPTable headerTable = new PdfPTable(new float[]{62f, 38f});
        headerTable.setWidthPercentage(100);
        headerTable.setSpacingAfter(3f);

        // Left Header: Shop details
        PdfPCell shopCell = new PdfPCell();
        shopCell.setBorder(Rectangle.NO_BORDER);
        shopCell.addElement(new Paragraph(shop.name(), shopTitleFont));
        for (String line : shop.addressLines()) {
            shopCell.addElement(new Paragraph(line, smallFont));
        }
        shopCell.addElement(new Paragraph("Prop: " + shop.ownerName() + " | Phone: " + shop.mobile(), smallFont));
        headerTable.addCell(shopCell);

        // Right Header: Receipt metadata & badge
        PdfPCell receiptMetaCell = new PdfPCell();
        receiptMetaCell.setBorder(Rectangle.NO_BORDER);
        receiptMetaCell.setHorizontalAlignment(Element.ALIGN_RIGHT);

        Paragraph badgePara = new Paragraph("[ " + copyLabel + " ]", badgeFont);
        badgePara.setAlignment(Element.ALIGN_RIGHT);
        receiptMetaCell.addElement(badgePara);

        Paragraph receiptTitle = new Paragraph("SERVICE RECEIPT", headerTitleFont);
        receiptTitle.setAlignment(Element.ALIGN_RIGHT);
        receiptMetaCell.addElement(receiptTitle);

        Paragraph trackingPara = new Paragraph("Tracking: " + ticket.getTrackingNumber(), boldFont);
        trackingPara.setAlignment(Element.ALIGN_RIGHT);
        receiptMetaCell.addElement(trackingPara);

        Paragraph datePara = new Paragraph("Date: " + RECEIPT_DATE.format(ticket.getCreatedAt()), smallFont);
        datePara.setAlignment(Element.ALIGN_RIGHT);
        receiptMetaCell.addElement(datePara);

        headerTable.addCell(receiptMetaCell);
        document.add(headerTable);

        // Main Details Table (4-column compact layout: 16% Label, 34% Value, 18% Label, 32% Value)
        PdfPTable table = new PdfPTable(new float[]{16f, 34f, 18f, 32f});
        table.setWidthPercentage(100);

        // Row 1
        addCell(table, "Customer Name", labelFont, false, true);
        addCell(table, ticket.getCustomer().getFullName(), boldFont, false, false);
        addCell(table, "Device Model", labelFont, false, true);
        addCell(table, ticket.getBrand() + " " + ticket.getModel(), boldFont, false, false);

        // Row 2
        addCell(table, "Mobile Number", labelFont, false, true);
        addCell(table, ticket.getCustomer().getMobile(), valueFont, false, false);
        addCell(table, "Device Color", labelFont, false, true);
        addCell(table, ticket.getColor() != null && !ticket.getColor().isBlank() ? ticket.getColor() : "-", valueFont, false, false);

        // Row 3
        String acc = ticket.getAccessoriesReceived() != null && !ticket.getAccessoriesReceived().isEmpty()
                ? String.join(", ", ticket.getAccessoriesReceived())
                : "-";
        addCell(table, "Accessories", labelFont, false, true);
        addCell(table, acc, valueFont, false, false);
        addCell(table, "IMEI Number", labelFont, false, true);
        addCell(table, ticket.getImei() != null && !ticket.getImei().isBlank() ? ticket.getImei() : "-", valueFont, false, false);

        // Row 4
        addCell(table, "Problem", labelFont, false, true);
        addCell(table, ticket.getProblemDescription(), valueFont, false, false);
        addCell(table, "Estimated Cost", labelFont, false, true);
        addCell(table, "₹" + ticket.getEstimatedCost(), valueFont, false, false);

        // Row 5
        String statusLabel = ticket.getStatus() != null ? ticket.getStatus().name().replace('_', ' ') : "-";
        addCell(table, "Status", labelFont, false, true);
        addCell(table, statusLabel, valueFont, false, false);
        addCell(table, "Advance Paid", labelFont, false, true);
        addCell(table, "₹" + ticket.getAdvancePaid(), valueFont, false, false);

        // Row 6: Delivery Date & Balance/Payment Status
        if (ticket.getDeliveredAt() != null) {
            addCell(table, "Delivery Date", labelFont, false, true);
            addCell(table, DATE_ONLY.format(ticket.getDeliveredAt()), boldFont, false, false);
        } else {
            String edd = ticket.getEstimatedDeliveryDate() != null
                    ? LOCAL_DATE_FMT.format(ticket.getEstimatedDeliveryDate())
                    : "Upon Completion";
            addCell(table, "Est. Delivery", labelFont, false, true);
            addCell(table, edd, valueFont, false, false);
        }

        boolean isSettled = ticket.getEstimatedCost() != null
                && ticket.getEstimatedCost().compareTo(BigDecimal.ZERO) > 0
                && ticket.getBalanceAmount().compareTo(BigDecimal.ZERO) <= 0;
        boolean isUnquoted = ticket.getEstimatedCost() == null
                || ticket.getEstimatedCost().compareTo(BigDecimal.ZERO) == 0;

        if (isSettled) {
            addCell(table, "Payment Status", labelFont, false, true);
            PdfPCell paidCell = new PdfPCell(new Phrase("PAID IN FULL ✓", FontFactory.getFont(FontFactory.HELVETICA_BOLD, 8f, new Color(21, 128, 61))));
            paidCell.setBackgroundColor(new Color(240, 253, 244));
            paidCell.setPaddingTop(2.5f);
            paidCell.setPaddingBottom(2.5f);
            paidCell.setPaddingLeft(5f);
            paidCell.setPaddingRight(5f);
            paidCell.setBorderColor(new Color(187, 247, 208));
            table.addCell(paidCell);
        } else if (isUnquoted) {
            addCell(table, "Payment Status", labelFont, false, true);
            addCell(table, "Pending Diagnosis", valueFont, false, false);
        } else {
            addCell(table, "Balance to Pay", labelFont, true, true);
            addCell(table, "₹" + ticket.getBalanceAmount(), FontFactory.getFont(FontFactory.HELVETICA_BOLD, 8f, new Color(180, 83, 9)), true, false);
        }

        // Row 7: Warranty Period spanning across (only rendered when warranty is explicitly given)
        int warrantyDays = ticket.getWarrantyDays() != null ? ticket.getWarrantyDays() : 0;
        if (warrantyDays > 0) {
            addCell(table, "Warranty", labelFont, false, true);
            String warrantyVal;
            if (ticket.getDeliveredAt() != null) {
                Instant expiry = ticket.getDeliveredAt().plus(warrantyDays, ChronoUnit.DAYS);
                warrantyVal = warrantyDays + " Days (Valid till " + DATE_ONLY.format(expiry) + ")";
            } else {
                warrantyVal = warrantyDays + " Days (From delivery date)";
            }
            PdfPCell warrantyCell = new PdfPCell(new Phrase(warrantyVal, boldFont));
            warrantyCell.setColspan(3);
            warrantyCell.setPaddingTop(2.5f);
            warrantyCell.setPaddingBottom(2.5f);
            warrantyCell.setPaddingLeft(5f);
            warrantyCell.setPaddingRight(5f);
            warrantyCell.setBorderColor(new Color(226, 232, 240));
            table.addCell(warrantyCell);
        }

        document.add(table);

        // Footer Section (2 columns: Terms & Signatures on left, QR Code on right)
        PdfPTable footerTable = new PdfPTable(new float[]{78f, 22f});
        footerTable.setWidthPercentage(100);
        footerTable.setSpacingBefore(3f);

        // Terms & Signatures column
        PdfPCell termsCell = new PdfPCell();
        termsCell.setBorder(Rectangle.NO_BORDER);

        Paragraph termsHeader = new Paragraph("Important Terms:", labelFont);
        termsHeader.setSpacingAfter(1f);
        termsCell.addElement(termsHeader);
        if (warrantyDays > 0) {
            if (ticket.getDeliveredAt() != null) {
                Instant expiry = ticket.getDeliveredAt().plus(warrantyDays, ChronoUnit.DAYS);
                termsCell.addElement(new Paragraph("• Warranty: " + warrantyDays + " Days (Delivered: " + DATE_ONLY.format(ticket.getDeliveredAt()) + " · Valid till: " + DATE_ONLY.format(expiry) + ").", noteFont));
            } else {
                termsCell.addElement(new Paragraph("• Warranty: " + warrantyDays + " Days from collection/delivery date.", noteFont));
            }
        }
        for (String term : shop.terms()) {
            termsCell.addElement(new Paragraph("• " + term, noteFont));
        }

        Paragraph sigPara = new Paragraph("Authorized Sign: ____________________", smallFont);
        sigPara.setSpacingBefore(5f);
        termsCell.addElement(sigPara);
        footerTable.addCell(termsCell);

        // QR Code column
        PdfPCell qrCell = new PdfPCell();
        qrCell.setBorder(Rectangle.NO_BORDER);
        qrCell.setHorizontalAlignment(Element.ALIGN_CENTER);
        qrCell.addElement(qr);

        Paragraph qrText = new Paragraph("Scan to track status", smallFont);
        qrText.setAlignment(Element.ALIGN_CENTER);
        qrCell.addElement(qrText);
        footerTable.addCell(qrCell);

        document.add(footerTable);
    }

    private void addCell(PdfPTable table, String text, Font font, boolean highlight, boolean isLabel) {
        PdfPCell cell = new PdfPCell(new Phrase(text != null && !text.isBlank() ? text : "-", font));
        if (highlight) {
            cell.setBackgroundColor(new Color(254, 243, 199)); // subtle warm yellow highlight for Balance Due
        } else if (isLabel) {
            cell.setBackgroundColor(new Color(248, 250, 252)); // slate-50 light label background
        }
        cell.setPaddingTop(2.5f);
        cell.setPaddingBottom(2.5f);
        cell.setPaddingLeft(5f);
        cell.setPaddingRight(5f);
        cell.setBorderColor(new Color(226, 232, 240)); // subtle slate-200 border
        table.addCell(cell);
    }

    private byte[] generateQrBytes(String content) throws Exception {
        QRCodeWriter writer = new QRCodeWriter();
        BitMatrix matrix = writer.encode(content, BarcodeFormat.QR_CODE, 160, 160);
        BufferedImage image = MatrixToImageWriter.toBufferedImage(matrix);
        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        javax.imageio.ImageIO.write(image, "PNG", baos);
        return baos.toByteArray();
    }
}
