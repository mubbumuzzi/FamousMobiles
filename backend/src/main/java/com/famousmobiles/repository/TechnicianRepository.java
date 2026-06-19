package com.famousmobiles.repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import com.famousmobiles.domain.Technician;

public interface TechnicianRepository extends JpaRepository<Technician, UUID> {
    Optional<Technician> findByUserId(UUID userId);

    List<Technician> findByActiveTrueOrderByNameAsc();

    @Query("""
            SELECT t FROM Technician t
            INNER JOIN t.user u
            WHERE t.active = true AND u.active = true AND u.role = com.famousmobiles.domain.enums.UserRole.TECHNICIAN
            ORDER BY t.name ASC
            """)
    List<Technician> findActiveStaffTechnicians();
}
