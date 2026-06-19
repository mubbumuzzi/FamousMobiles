package com.famousmobiles.dto;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import com.famousmobiles.domain.InventoryItem;
import com.famousmobiles.domain.Technician;
import com.famousmobiles.domain.enums.SkillLevel;

public final class MiscDto {

    private MiscDto() {}

    public record TechnicianRequest(
            String name,
            String mobile,
            SkillLevel skillLevel,
            UUID userId
    ) {}

    public record TechnicianResponse(
            UUID id,
            String name,
            String mobile,
            SkillLevel skillLevel,
            boolean active,
            UUID userId,
            long assignedJobs,
            long completedJobs,
            Double averageRepairTimeHours
    ) {
        public static TechnicianResponse from(Technician t) {
            return new TechnicianResponse(
                    t.getId(), t.getName(), t.getMobile(), t.getSkillLevel(), t.isActive(),
                    t.getUser() != null ? t.getUser().getId() : null, 0, 0, null
            );
        }
    }

    public record InventoryItemRequest(
            String partName,
            String sku,
            int quantity,
            BigDecimal costPrice,
            BigDecimal sellingPrice,
            int lowStockThreshold
    ) {}

    public record InventoryItemResponse(
            UUID id,
            String partName,
            String sku,
            int quantity,
            BigDecimal costPrice,
            BigDecimal sellingPrice,
            int lowStockThreshold,
            boolean lowStock
    ) {
        public static InventoryItemResponse from(InventoryItem item) {
            return new InventoryItemResponse(
                    item.getId(), item.getPartName(), item.getSku(), item.getQuantity(),
                    item.getCostPrice(), item.getSellingPrice(), item.getLowStockThreshold(), item.isLowStock()
            );
        }
    }

    public record InventoryAdjustRequest(int quantity, String notes) {}

    public record DashboardMetrics(
            long devicesReceivedToday,
            long devicesUnderRepair,
            long waitingForParts,
            long readyForPickup,
            long deliveredToday,
            BigDecimal revenueToday,
            BigDecimal revenueThisWeek,
            BigDecimal revenueThisMonth,
            Map<String, Long> statusBreakdown
    ) {}

    public record SearchResult(
            List<TicketDto.TicketResponse> tickets,
            List<CustomerDto.CustomerResponse> customers
    ) {}
}
