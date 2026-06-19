package com.famousmobiles.repository;

import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import com.famousmobiles.domain.DevicePhoto;

public interface DevicePhotoRepository extends JpaRepository<DevicePhoto, UUID> {
    List<DevicePhoto> findByTicketIdOrderByCreatedAtAsc(UUID ticketId);
}
