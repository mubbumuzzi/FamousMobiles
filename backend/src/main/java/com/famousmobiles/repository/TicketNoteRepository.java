package com.famousmobiles.repository;

import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.famousmobiles.domain.TicketNote;

public interface TicketNoteRepository extends JpaRepository<TicketNote, UUID> {
    List<TicketNote> findByTicketIdOrderByCreatedAtAsc(UUID ticketId);

    @Query("""
            SELECT n FROM TicketNote n
            LEFT JOIN FETCH n.author
            WHERE n.ticket.id = :ticketId
            ORDER BY n.createdAt ASC
            """)
    List<TicketNote> findByTicketIdWithAuthorOrderByCreatedAtAsc(@Param("ticketId") UUID ticketId);
}
