package com.famousmobiles.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

import com.famousmobiles.domain.AccessorySale;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

public final class AccessorySaleDto {

    private AccessorySaleDto() {}

    public record CreateAccessorySaleRequest(
            @NotBlank(message = "Accessory name is required") String accessoryName,
            @NotNull(message = "Price is required") @Positive(message = "Price must be positive") BigDecimal price,
            Integer quantity,
            BigDecimal unitPrice,
            BigDecimal discount,
            String paymentMode,
            Integer warrantyMonths,
            String serialNumber,
            String customerName,
            @NotBlank(message = "Customer mobile is required") String customerMobile,
            String notes,
            UUID storeId
    ) {
        public CreateAccessorySaleRequest(
                String accessoryName,
                BigDecimal price,
                String paymentMode,
                Integer warrantyMonths,
                String serialNumber,
                String customerName,
                String customerMobile,
                String notes,
                UUID storeId
        ) {
            this(accessoryName, price, 1, price, BigDecimal.ZERO, paymentMode, warrantyMonths, serialNumber, customerName, customerMobile, notes, storeId);
        }
    }

    public record VoidSaleRequest(
            String reason
    ) {}

    public record AccessorySaleResponse(
            UUID id,
            String billNumber,
            UUID customerId,
            String customerName,
            String customerMobile,
            String accessoryName,
            BigDecimal price,
            Integer quantity,
            BigDecimal unitPrice,
            BigDecimal discount,
            String paymentMode,
            Integer warrantyMonths,
            LocalDate warrantyExpiresAt,
            String serialNumber,
            String notes,
            String soldByName,
            String storeName,
            Instant soldAt,
            Instant createdAt,
            String status,
            Instant cancelledAt,
            String cancelledByName,
            String cancellationReason
    ) {
        public static AccessorySaleResponse from(AccessorySale sale) {
            return new AccessorySaleResponse(
                    sale.getId(),
                    sale.getBillNumber(),
                    sale.getCustomer() != null ? sale.getCustomer().getId() : null,
                    sale.getCustomerName(),
                    sale.getCustomerMobile(),
                    sale.getAccessoryName(),
                    sale.getPrice(),
                    sale.getQuantity(),
                    sale.getUnitPrice(),
                    sale.getDiscount(),
                    sale.getPaymentMode(),
                    sale.getWarrantyMonths(),
                    sale.getWarrantyExpiresAt(),
                    sale.getSerialNumber(),
                    sale.getNotes(),
                    sale.getSoldBy() != null ? sale.getSoldBy().getFullName() : null,
                    sale.getStore() != null ? sale.getStore().getName() : null,
                    sale.getSoldAt(),
                    sale.getCreatedAt(),
                    sale.getStatus(),
                    sale.getCancelledAt(),
                    sale.getCancelledBy() != null ? sale.getCancelledBy().getFullName() : null,
                    sale.getCancellationReason()
            );
        }
    }
}
