package com.famousmobiles.controller;

import java.time.LocalDate;

import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.famousmobiles.domain.enums.RepairStatus;
import com.famousmobiles.service.ReportService;

@RestController
@RequestMapping("/api/reports")
@PreAuthorize("hasRole('ADMIN')")
public class ReportController {

    private final ReportService reportService;

    public ReportController(ReportService reportService) {
        this.reportService = reportService;
    }

    @GetMapping("/repairs")
    public ResponseEntity<byte[]> repairs(
            @RequestParam LocalDate from,
            @RequestParam LocalDate to,
            @RequestParam(required = false) RepairStatus status,
            @RequestParam(defaultValue = "pdf") String format) throws Exception {
        byte[] data = "xlsx".equals(format)
                ? reportService.exportRepairsExcel(from, to, status)
                : reportService.exportRepairsPdf(from, to, status);
        String contentType = "xlsx".equals(format)
                ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                : MediaType.APPLICATION_PDF_VALUE;
        String ext = "xlsx".equals(format) ? "xlsx" : "pdf";
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=repairs." + ext)
                .contentType(MediaType.parseMediaType(contentType))
                .body(data);
    }

    @GetMapping("/inventory")
    public ResponseEntity<byte[]> inventory(@RequestParam(defaultValue = "xlsx") String format) throws Exception {
        byte[] data = reportService.exportInventoryExcel();
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=inventory.xlsx")
                .contentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                .body(data);
    }
}
