package com.famousmobiles.repository;

import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.famousmobiles.domain.Payment;

public interface PaymentRepository extends JpaRepository<Payment, UUID> {
    List<Payment> findByTicketIdOrderByCreatedAtAsc(UUID ticketId);

    @Query("""
            SELECT p FROM Payment p
            JOIN FETCH p.ticket
            LEFT JOIN FETCH p.recordedBy
            WHERE p.ticket.id = :ticketId
            ORDER BY p.createdAt ASC
            """)
    List<Payment> findByTicketIdWithDetailsOrderByCreatedAtAsc(@Param("ticketId") UUID ticketId);

    @Query("SELECT p FROM Payment p JOIN p.ticket t WHERE t.balanceAmount > 0 ORDER BY t.createdAt DESC")
    List<Payment> findTicketsWithOutstandingBalance();
}
