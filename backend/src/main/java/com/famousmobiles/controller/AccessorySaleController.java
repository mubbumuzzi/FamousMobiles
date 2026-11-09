package com.famousmobiles.controller;

import java.util.List;
import java.util.UUID;

import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.famousmobiles.dto.AccessorySaleDto;
import com.famousmobiles.service.AccessorySaleService;
import com.famousmobiles.service.PdfReceiptService;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/accessory-sales")
public class AccessorySaleController {

    private final AccessorySaleService accessorySaleService;
    private final PdfReceiptService pdfReceiptService;

    public AccessorySaleController(AccessorySaleService accessorySaleService, PdfReceiptService pdfReceiptService) {
        this.accessorySaleService = accessorySaleService;
        this.pdfReceiptService = pdfReceiptService;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public AccessorySaleDto.AccessorySaleResponse create(@Valid @RequestBody AccessorySaleDto.CreateAccessorySaleRequest request) {
        return accessorySaleService.create(request);
    }

    @GetMapping
    public List<AccessorySaleDto.AccessorySaleResponse> list(
            @RequestParam(required = false) String q,
            @RequestParam(required = false, defaultValue = "0") int page,
            @RequestParam(required = false, defaultValue = "50") int size) {
        return accessorySaleService.list(q, page, size);
    }

    @GetMapping("/{id}")
    public AccessorySaleDto.AccessorySaleResponse getById(@PathVariable UUID id) {
        return accessorySaleService.getById(id);
    }

    @PostMapping("/{id}/void")
    public AccessorySaleDto.AccessorySaleResponse voidSale(
            @PathVariable UUID id,
            @RequestBody(required = false) AccessorySaleDto.VoidSaleRequest request) {
        return accessorySaleService.voidSale(id, request);
    }

    @GetMapping("/{id}/receipt/pdf")
    @org.springframework.transaction.annotation.Transactional(readOnly = true)
    public ResponseEntity<byte[]> receipt(
            @PathVariable UUID id,
            @RequestParam(required = false, defaultValue = "false") boolean duplicate,
            @RequestParam(required = false, defaultValue = "inline") String disposition) throws Exception {
        var sale = accessorySaleService.getEntity(id);
        byte[] pdf = pdfReceiptService.generateAccessoryWarrantyBill(sale, duplicate);
        String dispType = "attachment".equalsIgnoreCase(disposition) ? "attachment" : "inline";
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, dispType + "; filename=\"" + sale.getBillNumber() + ".pdf\"")
                .contentType(MediaType.APPLICATION_PDF)
                .body(pdf);
    }
}
