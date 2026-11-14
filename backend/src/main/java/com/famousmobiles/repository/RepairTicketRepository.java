package com.famousmobiles.repository;

import java.time.Instant;
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

    @Query("SELECT t FROM RepairTicket t JOIN FETCH t.customer LEFT JOIN FETCH t.assignedTechnician LEFT JOIN FETCH t.store WHERE t.trackingNumber = :trackingNumber")
    Optional<RepairTicket> findByTrackingNumberWithDetails(@Param("trackingNumber") String trackingNumber);

    List<RepairTicket> findByCustomerIdOrderByCreatedAtDesc(UUID customerId);

    @Query("SELECT t FROM RepairTicket t JOIN FETCH t.customer LEFT JOIN FETCH t.assignedTechnician LEFT JOIN FETCH t.store WHERE t.id = :id")
    Optional<RepairTicket> findByIdWithDetails(@Param("id") UUID id);

    @Query("SELECT t FROM RepairTicket t JOIN FETCH t.customer LEFT JOIN FETCH t.assignedTechnician LEFT JOIN FETCH t.store ORDER BY t.createdAt DESC")
    List<RepairTicket> findAllWithDetailsOrderByCreatedAtDesc();

    @Query("SELECT t FROM RepairTicket t JOIN FETCH t.customer LEFT JOIN FETCH t.assignedTechnician LEFT JOIN FETCH t.store WHERE t.store.id = :storeId ORDER BY t.createdAt DESC")
    List<RepairTicket> findByStoreIdWithDetailsOrderByCreatedAtDesc(@Param("storeId") UUID storeId);

    @Query("SELECT t FROM RepairTicket t JOIN FETCH t.customer LEFT JOIN FETCH t.assignedTechnician LEFT JOIN FETCH t.store WHERE t.assignedTechnician.id = :technicianId ORDER BY t.createdAt DESC")
    List<RepairTicket> findByAssignedTechnicianIdWithDetailsOrderByCreatedAtDesc(@Param("technicianId") UUID technicianId);

    List<RepairTicket> findByAssignedTechnicianIdOrderByCreatedAtDesc(UUID technicianId);

    @Query("SELECT t FROM RepairTicket t JOIN FETCH t.customer LEFT JOIN FETCH t.store WHERE t.customer.id = :customerId ORDER BY t.createdAt DESC")
    List<RepairTicket> findByCustomerIdWithDetailsOrderByCreatedAtDesc(@Param("customerId") UUID customerId);

    @Query("""
        SELECT DISTINCT t FROM RepairTicket t
        JOIN FETCH t.customer c
        LEFT JOIN FETCH t.assignedTechnician
        LEFT JOIN FETCH t.store
        LEFT JOIN c.phones p
        WHERE LOWER(t.trackingNumber) LIKE LOWER(CONCAT('%', :q, '%'))
           OR LOWER(c.fullName) LIKE LOWER(CONCAT('%', :q, '%'))
           OR c.mobile LIKE CONCAT('%', :q, '%')
           OR p.mobile LIKE CONCAT('%', :q, '%')
           OR LOWER(t.brand) LIKE LOWER(CONCAT('%', :q, '%'))
           OR LOWER(t.model) LIKE LOWER(CONCAT('%', :q, '%'))
           OR t.imei LIKE CONCAT('%', :q, '%')
        ORDER BY t.createdAt DESC
        """)
    List<RepairTicket> searchWithDetails(@Param("q") String query);

    @Query("""
        SELECT DISTINCT t FROM RepairTicket t
        JOIN FETCH t.customer c
        LEFT JOIN FETCH t.assignedTechnician
        LEFT JOIN FETCH t.store
        LEFT JOIN c.phones p
        WHERE (:storeId IS NULL OR t.store.id = :storeId)
          AND (LOWER(t.trackingNumber) LIKE LOWER(CONCAT('%', :q, '%'))
           OR LOWER(c.fullName) LIKE LOWER(CONCAT('%', :q, '%'))
           OR c.mobile LIKE CONCAT('%', :q, '%')
           OR p.mobile LIKE CONCAT('%', :q, '%')
           OR LOWER(t.brand) LIKE LOWER(CONCAT('%', :q, '%'))
           OR LOWER(t.model) LIKE LOWER(CONCAT('%', :q, '%'))
           OR t.imei LIKE CONCAT('%', :q, '%'))
        ORDER BY t.createdAt DESC
        """)
    List<RepairTicket> searchWithDetailsAndStore(@Param("q") String query, @Param("storeId") UUID storeId);

    @Query("""
        SELECT DISTINCT t FROM RepairTicket t
        JOIN FETCH t.customer c
        LEFT JOIN FETCH t.assignedTechnician tech
        LEFT JOIN FETCH t.store s
        WHERE t.createdAt >= :fromInstant AND t.createdAt < :toInstant
          AND (:status IS NULL OR t.status = :status)
          AND (:storeId IS NULL OR s.id = :storeId)
        ORDER BY t.createdAt DESC
        """)
    List<RepairTicket> findForReport(
        @Param("fromInstant") Instant fromInstant,
        @Param("toInstant") Instant toInstant,
        @Param("status") RepairStatus status,
        @Param("storeId") UUID storeId
    );

    long countByStatus(RepairStatus status);

    @Query("""
        SELECT COUNT(t) FROM RepairTicket t
        WHERE t.createdAt >= :start AND t.createdAt < :end
          AND (:storeId IS NULL OR t.store.id = :storeId)
        """)
    long countReceivedBetween(@Param("start") Instant start, @Param("end") Instant end, @Param("storeId") UUID storeId);

    @Query("""
        SELECT COUNT(t) FROM RepairTicket t
        WHERE t.status NOT IN (
            com.famousmobiles.domain.enums.RepairStatus.DELIVERED,
            com.famousmobiles.domain.enums.RepairStatus.READY_FOR_PICKUP,
            com.famousmobiles.domain.enums.RepairStatus.NOT_REPAIRABLE_READY_FOR_PICKUP,
            com.famousmobiles.domain.enums.RepairStatus.RETURNED_UNREPAIRED
        )
        AND (:storeId IS NULL OR t.store.id = :storeId)
        """)
    long countUnderRepair(@Param("storeId") UUID storeId);

    @Query("""
        SELECT COUNT(t) FROM RepairTicket t
        WHERE t.status = com.famousmobiles.domain.enums.RepairStatus.DELIVERED
          AND t.deliveredAt >= :start AND t.deliveredAt < :end
          AND (:storeId IS NULL OR t.store.id = :storeId)
        """)
    long countDeliveredBetween(@Param("start") Instant start, @Param("end") Instant end, @Param("storeId") UUID storeId);

    @Query("""
        SELECT t.status, COUNT(t) FROM RepairTicket t
        WHERE (:storeId IS NULL OR t.store.id = :storeId)
        GROUP BY t.status
        """)
    List<Object[]> countGroupByStatus(@Param("storeId") UUID storeId);

    @Query("""
        SELECT DISTINCT t FROM RepairTicket t
        JOIN t.customer c
        LEFT JOIN c.phones p
        WHERE c.mobile = :mobile OR p.mobile = :mobile
        ORDER BY t.createdAt DESC
        """)
    List<RepairTicket> findByCustomerMobile(@Param("mobile") String mobile);
}
