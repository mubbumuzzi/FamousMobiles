package com.famousmobiles.dto;

import java.math.BigDecimal;
import java.util.UUID;

import com.famousmobiles.domain.Payment;
import com.famousmobiles.domain.enums.PaymentMode;

public final class PaymentDto {

    private PaymentDto() {}

    public record PaymentRequest(
            BigDecimal amount,
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
                    p.getCreatedAt().toString()
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
            BigDecimal balanceAmount
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
                    p.getCreatedAt().toString(),
                    t.getBalanceAmount()
            );
        }
    }

    public record TodayRevenueSummary(
            BigDecimal totalRevenue,
            BigDecimal cashTotal,
            BigDecimal upiTotal,
            BigDecimal cardTotal,
            int transactionCount,
            java.util.List<DetailedPaymentResponse> payments
    ) {}
}
