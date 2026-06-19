package com.famousmobiles.dto;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

import com.famousmobiles.domain.RepairTicket;
import com.famousmobiles.domain.enums.DeviceType;
import com.famousmobiles.domain.enums.RepairStatus;

public final class TicketDto {

    private TicketDto() {}

    public record CreateTicketRequest(
            UUID customerId,
            DeviceType deviceType,
            String brand,
            String model,
            String color,
            String imei,
            List<String> accessoriesReceived,
            List<String> deviceCondition,
            String problemDescription,
            BigDecimal estimatedCost,
            BigDecimal advancePaid,
            String estimatedDeliveryDate
    ) {}

    public record UpdateTicketRequest(
            String brand,
            String model,
            String color,
            String imei,
            List<String> accessoriesReceived,
            List<String> deviceCondition,
            String problemDescription,
            BigDecimal estimatedCost,
            String estimatedDeliveryDate
    ) {}

    public record StatusUpdateRequest(
            RepairStatus status,
            String remarks,
            String technicianNotes
    ) {}

    public record AssignTechnicianRequest(UUID technicianId) {}

    public record TicketResponse(
            UUID id,
            String trackingNumber,
            CustomerDto.CustomerResponse customer,
            UUID assignedTechnicianId,
            String assignedTechnicianName,
            RepairStatus status,
            DeviceType deviceType,
            String brand,
            String model,
            String color,
            String imei,
            List<String> accessoriesReceived,
            List<String> deviceCondition,
            String problemDescription,
            BigDecimal estimatedCost,
            BigDecimal advancePaid,
            BigDecimal balanceAmount,
            String estimatedDeliveryDate,
            String createdAt,
            String deliveredAt
    ) {
        public static TicketResponse from(RepairTicket t) {
            return new TicketResponse(
                    t.getId(),
                    t.getTrackingNumber(),
                    CustomerDto.CustomerResponse.from(t.getCustomer()),
                    t.getAssignedTechnician() != null ? t.getAssignedTechnician().getId() : null,
                    t.getAssignedTechnician() != null ? t.getAssignedTechnician().getName() : null,
                    t.getStatus(),
                    t.getDeviceType(),
                    t.getBrand(),
                    t.getModel(),
                    t.getColor(),
                    t.getImei(),
                    t.getAccessoriesReceived(),
                    t.getDeviceCondition(),
                    t.getProblemDescription(),
                    t.getEstimatedCost(),
                    t.getAdvancePaid(),
                    t.getBalanceAmount(),
                    t.getEstimatedDeliveryDate() != null ? t.getEstimatedDeliveryDate().toString() : null,
                    t.getCreatedAt().toString(),
                    t.getDeliveredAt() != null ? t.getDeliveredAt().toString() : null
            );
        }
    }

    public record TimelineEntry(
            UUID id,
            String type,
            String title,
            String description,
            String authorName,
            String createdAt
    ) {}

    public record PublicTrackingResponse(
            String trackingNumber,
            String brand,
            String model,
            String color,
            String imeiMasked,
            RepairStatus currentStatus,
            String estimatedDeliveryDate,
            BigDecimal estimatedCost,
            BigDecimal advancePaid,
            BigDecimal balanceAmount,
            List<TimelineEntry> timeline,
            List<RepairStatus> allStatuses
    ) {}
}
