package com.famousmobiles.dto;

import java.math.BigDecimal;
import java.util.UUID;

import com.famousmobiles.domain.Payment;
import com.famousmobiles.domain.enums.PaymentMode;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

public final class PaymentDto {

    private PaymentDto() {}

    public record PaymentRequest(
            @NotNull(message = "Payment amount is required")
            @Positive(message = "Payment amount must be greater than zero")
            BigDecimal amount,

            @NotNull(message = "Payment mode is required")
            PaymentMode paymentMode,

            String notes
    ) {}

    public record PaymentResponse(
            UUID id,
            UUID ticketId,
            BigDecimal amount,
            PaymentMode paymentMode,
            String notes,
            String recordedByName,
            String createdAt
    ) {
        public static PaymentResponse from(Payment p) {
            return new PaymentResponse(
                    p.getId(),
                    p.getTicket().getId(),
                    p.getAmount(),
                    p.getPaymentMode(),
                    p.getNotes(),
                    p.getRecordedBy() != null ? p.getRecordedBy().getFullName() : null,
                    p.getCreatedAt() != null ? p.getCreatedAt().toString() : java.time.Instant.now().toString()
            );
        }
    }

    public record DetailedPaymentResponse(
            UUID id,
            UUID ticketId,
            String trackingNumber,
            String customerName,
            String customerMobile,
            String brand,
            String model,
            BigDecimal amount,
            PaymentMode paymentMode,
            String notes,
            String recordedByName,
            String createdAt,
            BigDecimal balanceAmount,
            String itemType,
            String billNumber,
            String accessoryName
    ) {
        public static DetailedPaymentResponse from(Payment p) {
            var t = p.getTicket();
            var c = t.getCustomer();
            return new DetailedPaymentResponse(
                    p.getId(),
                    t.getId(),
                    t.getTrackingNumber(),
                    c != null ? c.getFullName() : "Customer",
                    c != null ? c.getMobile() : "",
                    t.getBrand() != null ? t.getBrand() : "",
                    t.getModel() != null ? t.getModel() : "",
                    p.getAmount(),
                    p.getPaymentMode(),
                    p.getNotes(),
                    p.getRecordedBy() != null ? p.getRecordedBy().getFullName() : "Staff",
                    p.getCreatedAt() != null ? p.getCreatedAt().toString() : java.time.Instant.now().toString(),
                    t.getBalanceAmount(),
                    "REPAIR",
                    t.getTrackingNumber(),
                    null
            );
        }

        public static DetailedPaymentResponse from(com.famousmobiles.domain.AccessorySale a) {
            PaymentMode mode = PaymentMode.UPI;
            if (a.getPaymentMode() != null) {
                try {
                    mode = PaymentMode.valueOf(a.getPaymentMode().trim().toUpperCase());
                } catch (Exception ignored) {}
            }
            return new DetailedPaymentResponse(
                    a.getId(),
                    null,
                    a.getBillNumber(),
                    a.getCustomerName(),
                    a.getCustomerMobile(),
                    "Accessory",
                    a.getAccessoryName(),
                    a.getPrice(),
                    mode,
                    a.getNotes(),
                    a.getSoldBy() != null ? a.getSoldBy().getFullName() : "Staff",
                    a.getSoldAt() != null ? a.getSoldAt().toString() : a.getCreatedAt().toString(),
                    BigDecimal.ZERO,
                    "ACCESSORY_SALE",
                    a.getBillNumber(),
                    a.getAccessoryName()
            );
        }
    }

    public record TodayRevenueSummary(
            BigDecimal totalRevenue,
            BigDecimal cashTotal,
            BigDecimal upiTotal,
            BigDecimal cardTotal,
            int transactionCount,
            java.util.List<DetailedPaymentResponse> payments,
            BigDecimal repairRevenue,
            BigDecimal salesRevenue,
            int repairCount,
            int salesCount
    ) {}
}
