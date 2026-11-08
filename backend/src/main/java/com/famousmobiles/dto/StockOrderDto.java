package com.famousmobiles.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

import com.famousmobiles.domain.StockOrder;
import com.famousmobiles.domain.enums.StockOrderStatus;

import jakarta.validation.constraints.NotBlank;

public final class StockOrderDto {

    private StockOrderDto() {}

    public record CreateStockOrderRequest(
            UUID customerId,
            String customerName,
            String customerMobile,
            @NotBlank(message = "Item details are required") String itemDetails,
            Integer quantity,
            BigDecimal advanceAmount,
            BigDecimal expectedPrice,
            String notes
    ) {}

    public record UpdateStockOrderStatusRequest(
            StockOrderStatus status,
            String notes
    ) {}

    public record StockOrderResponse(
            UUID id,
            String orderCode,
            UUID customerId,
            String customerName,
            String customerMobile,
            String itemDetails,
            Integer quantity,
            BigDecimal advanceAmount,
            BigDecimal expectedPrice,
            StockOrderStatus status,
            String notes,
            String createdByName,
            Instant arrivedAt,
            Instant fulfilledAt,
            Instant createdAt,
            Instant updatedAt
    ) {
        public static StockOrderResponse from(StockOrder order) {
            return new StockOrderResponse(
                    order.getId(),
                    order.getOrderCode(),
                    order.getCustomer() != null ? order.getCustomer().getId() : null,
                    order.getCustomerName(),
                    order.getCustomerMobile(),
                    order.getItemDetails(),
                    order.getQuantity() != null ? order.getQuantity() : 1,
                    order.getAdvanceAmount() != null ? order.getAdvanceAmount() : BigDecimal.ZERO,
                    order.getExpectedPrice(),
                    order.getStatus(),
                    order.getNotes(),
                    order.getCreatedBy() != null ? order.getCreatedBy().getFullName() : null,
                    order.getArrivedAt(),
                    order.getFulfilledAt(),
                    order.getCreatedAt(),
                    order.getUpdatedAt()
            );
        }
    }
}
