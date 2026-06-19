package com.famousmobiles.service;

import org.springframework.stereotype.Component;

import com.famousmobiles.domain.NotificationLog;

@Component
public class NoOpNotificationDispatcher implements NotificationDispatcher {
    @Override
    public void dispatch(NotificationLog log) {
        // V1 stub — future WhatsApp/SMS/push integration
    }
}
