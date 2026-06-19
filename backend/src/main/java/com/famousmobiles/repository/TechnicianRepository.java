package com.famousmobiles.repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.famousmobiles.domain.Technician;

public interface TechnicianRepository extends JpaRepository<Technician, UUID> {
    Optional<Technician> findByUserId(UUID userId);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("UPDATE Technician t SET t.user = null, t.active = false WHERE t.user.id = :userId")
    void clearUserReferenceByUserId(@Param("userId") UUID userId);

    List<Technician> findByActiveTrueOrderByNameAsc();

    @Query("""
            SELECT t FROM Technician t
            JOIN FETCH t.user u
            WHERE t.active = true AND u.active = true AND u.role = com.famousmobiles.domain.enums.UserRole.TECHNICIAN
            ORDER BY t.name ASC
            """)
    List<Technician> findActiveStaffTechnicians();
}
