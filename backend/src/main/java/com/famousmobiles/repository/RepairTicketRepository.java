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

    @Query("SELECT t FROM RepairTicket t JOIN FETCH t.customer LEFT JOIN FETCH t.assignedTechnician WHERE t.id = :id")
    Optional<RepairTicket> findByIdWithDetails(@Param("id") UUID id);

    @Query("SELECT t FROM RepairTicket t JOIN FETCH t.customer LEFT JOIN FETCH t.assignedTechnician ORDER BY t.createdAt DESC")
    List<RepairTicket> findAllWithDetailsOrderByCreatedAtDesc();

    @Query("SELECT t FROM RepairTicket t JOIN FETCH t.customer LEFT JOIN FETCH t.assignedTechnician WHERE t.assignedTechnician.id = :technicianId ORDER BY t.createdAt DESC")
    List<RepairTicket> findByAssignedTechnicianIdWithDetailsOrderByCreatedAtDesc(@Param("technicianId") UUID technicianId);

    List<RepairTicket> findByAssignedTechnicianIdOrderByCreatedAtDesc(UUID technicianId);

    @Query("SELECT t FROM RepairTicket t JOIN FETCH t.customer WHERE t.customer.id = :customerId ORDER BY t.createdAt DESC")
    List<RepairTicket> findByCustomerIdWithDetailsOrderByCreatedAtDesc(@Param("customerId") UUID customerId);

    @Query("""
        SELECT DISTINCT t FROM RepairTicket t
        JOIN FETCH t.customer c
        LEFT JOIN FETCH t.assignedTechnician
        WHERE LOWER(t.trackingNumber) LIKE LOWER(CONCAT('%', :q, '%'))
           OR LOWER(c.fullName) LIKE LOWER(CONCAT('%', :q, '%'))
           OR c.mobile LIKE CONCAT('%', :q, '%')
           OR LOWER(t.model) LIKE LOWER(CONCAT('%', :q, '%'))
           OR t.imei LIKE CONCAT('%', :q, '%')
        ORDER BY t.createdAt DESC
        """)
    List<RepairTicket> searchWithDetails(@Param("q") String query);

    long countByStatus(RepairStatus status);

    @Query("SELECT t FROM RepairTicket t JOIN t.customer c WHERE c.mobile = :mobile ORDER BY t.createdAt DESC")
    List<RepairTicket> findByCustomerMobile(@Param("mobile") String mobile);
}
