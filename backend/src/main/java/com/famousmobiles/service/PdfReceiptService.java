package com.famousmobiles.service;

import java.awt.Color;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
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
import com.lowagie.text.Font;
import com.lowagie.text.FontFactory;
import com.lowagie.text.Image;
import com.lowagie.text.Paragraph;
import com.lowagie.text.Phrase;
import com.lowagie.text.pdf.PdfPCell;
import com.lowagie.text.pdf.PdfPTable;
import com.lowagie.text.pdf.PdfWriter;

@Service
public class PdfReceiptService {

    private static final DateTimeFormatter RECEIPT_DATE = DateTimeFormatter
            .ofPattern("dd MMM yyyy, hh:mm a", Locale.ENGLISH)
            .withZone(ZoneId.of("Asia/Kolkata"));

    private final AppProperties appProperties;
    private final FileStorageService fileStorageService;

    public PdfReceiptService(AppProperties appProperties, FileStorageService fileStorageService) {
        this.appProperties = appProperties;
        this.fileStorageService = fileStorageService;
    }

    public byte[] generateReceipt(RepairTicket ticket) throws Exception {
        byte[] pdf = buildPdf(ticket);
        Path cached = fileStorageService.getReceiptPath(ticket.getTrackingNumber());
        Files.write(cached, pdf);
        return pdf;
    }

    private byte[] buildPdf(RepairTicket ticket) throws Exception {
        ShopInfo.Resolved shop = ShopInfo.resolve(appProperties.shop());
        Document document = new Document();
        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        PdfWriter.getInstance(document, baos);
        document.open();

        Font titleFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 18);
        Font headerFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 12);
        Font normalFont = FontFactory.getFont(FontFactory.HELVETICA, 10);
        Font noteFont = FontFactory.getFont(FontFactory.HELVETICA_OBLIQUE, 9);

        document.add(new Paragraph(shop.name(), titleFont));
        for (String line : shop.addressLines()) {
            document.add(new Paragraph(line, normalFont));
        }
        document.add(new Paragraph("Owner: " + shop.ownerName(), normalFont));
        document.add(new Paragraph("Shop: " + shop.mobile(), normalFont));
        document.add(new Paragraph(" "));
        document.add(new Paragraph("Service Receipt", headerFont));
        document.add(new Paragraph("Tracking: " + ticket.getTrackingNumber(), normalFont));
        document.add(new Paragraph("Date: " + RECEIPT_DATE.format(ticket.getCreatedAt()), normalFont));
        document.add(new Paragraph(" "));

        PdfPTable table = new PdfPTable(2);
        table.setWidthPercentage(100);
        addRow(table, "Customer", ticket.getCustomer().getFullName(), normalFont);
        addRow(table, "Mobile", ticket.getCustomer().getMobile(), normalFont);
        addRow(table, "Device", ticket.getBrand() + " " + ticket.getModel(), normalFont);
        addRow(table, "Color", ticket.getColor(), normalFont);
        addRow(table, "IMEI", ticket.getImei(), normalFont);
        addRow(table, "Accessories", String.join(", ", ticket.getAccessoriesReceived()), normalFont);
        addRow(table, "Problem", ticket.getProblemDescription(), normalFont);
        addRow(table, "Estimated Cost", "₹" + ticket.getEstimatedCost(), normalFont);
        addRow(table, "Advance Paid", "₹" + ticket.getAdvancePaid(), normalFont);
        addRow(table, "Balance", "₹" + ticket.getBalanceAmount(), normalFont);
        document.add(table);
        document.add(new Paragraph(" "));

        document.add(new Paragraph("Important", headerFont));
        for (String term : shop.terms()) {
            document.add(new Paragraph("• " + term, noteFont));
        }
        document.add(new Paragraph(" "));

        String trackUrl = appProperties.publicAppUrl() + "/track/" + ticket.getTrackingNumber();
        Image qr = Image.getInstance(generateQrBytes(trackUrl));
        qr.scaleAbsolute(100, 100);
        document.add(qr);
        document.add(new Paragraph("Scan to track: " + trackUrl, normalFont));

        document.close();
        return baos.toByteArray();
    }

    private void addRow(PdfPTable table, String label, String value, Font font) {
        PdfPCell labelCell = new PdfPCell(new Phrase(label, font));
        labelCell.setBackgroundColor(new Color(240, 240, 240));
        table.addCell(labelCell);
        table.addCell(new Phrase(value != null && !value.isBlank() ? value : "-", font));
    }

    private byte[] generateQrBytes(String content) throws Exception {
        QRCodeWriter writer = new QRCodeWriter();
        BitMatrix matrix = writer.encode(content, BarcodeFormat.QR_CODE, 200, 200);
        BufferedImage image = MatrixToImageWriter.toBufferedImage(matrix);
        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        javax.imageio.ImageIO.write(image, "PNG", baos);
        return baos.toByteArray();
    }
}
