package com.famousmobiles.repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.famousmobiles.domain.AccessorySale;

@Repository
public interface AccessorySaleRepository extends JpaRepository<AccessorySale, UUID> {

    Optional<AccessorySale> findByBillNumber(String billNumber);

    @Query("SELECT a FROM AccessorySale a LEFT JOIN FETCH a.customer LEFT JOIN FETCH a.soldBy LEFT JOIN FETCH a.store WHERE a.id = :id")
    Optional<AccessorySale> findByIdWithDetails(@Param("id") UUID id);

    List<AccessorySale> findTop50ByOrderBySoldAtDesc();

    @Query("""
        SELECT a FROM AccessorySale a
        WHERE LOWER(a.billNumber) LIKE LOWER(CONCAT('%', :q, '%'))
           OR a.customerMobile LIKE CONCAT('%', :q, '%')
           OR LOWER(a.customerName) LIKE LOWER(CONCAT('%', :q, '%'))
           OR LOWER(a.accessoryName) LIKE LOWER(CONCAT('%', :q, '%'))
           OR LOWER(COALESCE(a.serialNumber, '')) LIKE LOWER(CONCAT('%', :q, '%'))
        ORDER BY a.soldAt DESC
    """)
    Page<AccessorySale> search(@Param("q") String query, Pageable pageable);
}
