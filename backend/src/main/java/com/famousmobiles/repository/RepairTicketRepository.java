package com.famousmobiles.repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.famousmobiles.domain.RepairTicket;
import com.famousmobiles.domain.enums.RepairStatus;

public interface RepairTicketRepository extends JpaRepository<RepairTicket, UUID> {
    Optional<RepairTicket> findByTrackingNumber(String trackingNumber);

    List<RepairTicket> findByCustomerIdOrderByCreatedAtDesc(UUID customerId);

    List<RepairTicket> findByAssignedTechnicianIdOrderByCreatedAtDesc(UUID technicianId);

    long countByStatus(RepairStatus status);

    @Query("SELECT t FROM RepairTicket t JOIN t.customer c WHERE c.mobile = :mobile ORDER BY t.createdAt DESC")
    List<RepairTicket> findByCustomerMobile(@Param("mobile") String mobile);

    @Query("""
        SELECT t FROM RepairTicket t JOIN t.customer c
        WHERE LOWER(t.trackingNumber) LIKE LOWER(CONCAT('%', :q, '%'))
           OR LOWER(c.fullName) LIKE LOWER(CONCAT('%', :q, '%'))
           OR c.mobile LIKE CONCAT('%', :q, '%')
           OR LOWER(t.model) LIKE LOWER(CONCAT('%', :q, '%'))
           OR t.imei LIKE CONCAT('%', :q, '%')
        ORDER BY t.createdAt DESC
        """)
    List<RepairTicket> search(@Param("q") String query);
}
