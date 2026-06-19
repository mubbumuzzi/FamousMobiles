package com.famousmobiles.repository;

import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.famousmobiles.domain.TicketStatusHistory;

public interface TicketStatusHistoryRepository extends JpaRepository<TicketStatusHistory, UUID> {
    List<TicketStatusHistory> findByTicketIdOrderByCreatedAtAsc(UUID ticketId);

    @Query("""
            SELECT h FROM TicketStatusHistory h
            LEFT JOIN FETCH h.changedBy
            WHERE h.ticket.id = :ticketId
            ORDER BY h.createdAt ASC
            """)
    List<TicketStatusHistory> findByTicketIdWithChangedByOrderByCreatedAtAsc(@Param("ticketId") UUID ticketId);
}
