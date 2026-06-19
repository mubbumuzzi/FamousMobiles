package com.famousmobiles.service;

import org.springframework.stereotype.Service;

import com.famousmobiles.domain.RepairTicket;
import com.famousmobiles.domain.enums.NotificationTemplate;
import com.famousmobiles.domain.enums.RepairStatus;

@Service
public class NotificationTemplateService {

    public String buildMessage(NotificationTemplate template, RepairTicket ticket) {
        String trackingId = ticket.getTrackingNumber();
        String customerName = ticket.getCustomer().getFullName();
        return switch (template) {
            case TICKET_CREATED -> """
                Dear Customer,

                Your device has been successfully registered.

                Tracking ID: %s
                """.formatted(trackingId);
            case REPAIR_STARTED -> """
                Dear %s,

                Your device repair has started.

                Tracking ID: %s
                """.formatted(customerName, trackingId);
            case WAITING_FOR_APPROVAL -> """
                Dear %s,

                Estimate is ready. Please approve repair.

                Tracking ID: %s
                """.formatted(customerName, trackingId);
            case READY_FOR_PICKUP -> """
                Dear %s,

                Your device is ready for collection.

                Tracking ID: %s
                """.formatted(customerName, trackingId);
            case DELIVERED -> """
                Dear %s,

                Thank you for choosing Famous Mobiles.

                Tracking ID: %s
                """.formatted(customerName, trackingId);
        };
    }

    public NotificationTemplate templateForStatus(RepairStatus status) {
        return switch (status) {
            case DEVICE_RECEIVED -> NotificationTemplate.TICKET_CREATED;
            case REPAIR_IN_PROGRESS -> NotificationTemplate.REPAIR_STARTED;
            case WAITING_FOR_APPROVAL -> NotificationTemplate.WAITING_FOR_APPROVAL;
            case READY_FOR_PICKUP -> NotificationTemplate.READY_FOR_PICKUP;
            case DELIVERED -> NotificationTemplate.DELIVERED;
            default -> null;
        };
    }
}
