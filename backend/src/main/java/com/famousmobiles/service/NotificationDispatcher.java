package com.famousmobiles.service;

import com.famousmobiles.domain.NotificationLog;

public interface NotificationDispatcher {
    void dispatch(NotificationLog log);
}
