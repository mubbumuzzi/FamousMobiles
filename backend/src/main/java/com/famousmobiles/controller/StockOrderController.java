package com.famousmobiles.controller;

import java.util.List;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.famousmobiles.dto.StockOrderDto;
import com.famousmobiles.service.StockOrderService;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/stock-orders")
public class StockOrderController {

    private final StockOrderService stockOrderService;

    public StockOrderController(StockOrderService stockOrderService) {
        this.stockOrderService = stockOrderService;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public StockOrderDto.StockOrderResponse create(@Valid @RequestBody StockOrderDto.CreateStockOrderRequest request) {
        return stockOrderService.create(request);
    }

    @GetMapping
    public List<StockOrderDto.StockOrderResponse> list(
            @RequestParam(required = false, defaultValue = "ACTIVE") String status) {
        return stockOrderService.list(status);
    }

    @PatchMapping("/{id}/status")
    public StockOrderDto.StockOrderResponse updateStatus(
            @PathVariable UUID id,
            @RequestBody StockOrderDto.UpdateStockOrderStatusRequest request) {
        return stockOrderService.updateStatus(id, request);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable UUID id) {
        stockOrderService.delete(id);
    }
}
