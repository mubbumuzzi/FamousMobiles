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
}
