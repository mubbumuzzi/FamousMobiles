package com.famousmobiles.service;

import java.util.List;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.famousmobiles.domain.NotificationLog;
import com.famousmobiles.domain.RepairTicket;
import com.famousmobiles.domain.enums.NotificationTemplate;
import com.famousmobiles.domain.enums.RepairStatus;
import com.famousmobiles.repository.NotificationLogRepository;

@Service
public class NotificationService {

    private final NotificationLogRepository notificationLogRepository;
    private final NotificationTemplateService templateService;
    private final NotificationDispatcher dispatcher;

    public NotificationService(NotificationLogRepository notificationLogRepository,
            NotificationTemplateService templateService, NotificationDispatcher dispatcher) {
        this.notificationLogRepository = notificationLogRepository;
        this.templateService = templateService;
        this.dispatcher = dispatcher;
    }

    @Transactional
    public void onStatusChange(RepairTicket ticket, RepairStatus newStatus) {
        NotificationTemplate template = templateService.templateForStatus(newStatus);
        if (template == null) {
            return;
        }
        String message = templateService.buildMessage(template, ticket);
        NotificationLog log = new NotificationLog();
        log.setTicket(ticket);
        log.setTemplate(template);
        log.setRecipientMobile(ticket.getCustomer().getMobile());
        log.setMessageBody(message);
        notificationLogRepository.save(log);
        dispatcher.dispatch(log);
    }

    public List<NotificationLog> getByTicket(UUID ticketId) {
        return notificationLogRepository.findByTicketIdOrderByCreatedAtDesc(ticketId);
    }
}
