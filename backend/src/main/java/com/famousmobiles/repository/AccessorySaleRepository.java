package com.famousmobiles.repository;

import java.math.BigDecimal;
import java.time.Instant;
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

    @Query("""
        SELECT a FROM AccessorySale a
        LEFT JOIN FETCH a.customer
        LEFT JOIN FETCH a.soldBy
        LEFT JOIN FETCH a.store
        ORDER BY a.soldAt DESC
    """)
    List<AccessorySale> findTop50WithDetailsByOrderBySoldAtDesc();

    @Query("""
        SELECT a FROM AccessorySale a
        LEFT JOIN FETCH a.customer
        LEFT JOIN FETCH a.soldBy
        LEFT JOIN FETCH a.store
        WHERE (:storeId IS NULL OR a.store.id = :storeId)
        ORDER BY a.soldAt DESC
    """)
    List<AccessorySale> findTop50WithDetailsByStoreOrderBySoldAtDesc(@Param("storeId") UUID storeId);

    @Query("""
        SELECT a FROM AccessorySale a
        LEFT JOIN FETCH a.customer
        LEFT JOIN FETCH a.soldBy
        LEFT JOIN FETCH a.store
        WHERE a.customer.id = :customerId
        ORDER BY a.soldAt DESC
    """)
    List<AccessorySale> findByCustomerIdWithDetails(@Param("customerId") UUID customerId);

    @Query("""
        SELECT COALESCE(SUM(a.price), 0) FROM AccessorySale a
        WHERE a.soldAt >= :since
          AND a.status = 'COMPLETED'
          AND (:storeId IS NULL OR a.store.id = :storeId)
    """)
    BigDecimal sumSalesSince(@Param("since") Instant since, @Param("storeId") UUID storeId);

    @Query("""
        SELECT COUNT(a) FROM AccessorySale a
        WHERE a.soldAt >= :since
          AND a.status = 'COMPLETED'
          AND (:storeId IS NULL OR a.store.id = :storeId)
    """)
    long countSalesSince(@Param("since") Instant since, @Param("storeId") UUID storeId);

    @Query("""
        SELECT a FROM AccessorySale a
        LEFT JOIN FETCH a.customer
        LEFT JOIN FETCH a.soldBy
        LEFT JOIN FETCH a.store
        WHERE a.soldAt >= :since
        ORDER BY a.soldAt DESC
    """)
    List<AccessorySale> findSalesSinceWithDetails(@Param("since") Instant since);

    @Query("""
        SELECT a FROM AccessorySale a
        LEFT JOIN FETCH a.customer
        LEFT JOIN FETCH a.soldBy
        LEFT JOIN FETCH a.store
        WHERE a.soldAt >= :from AND a.soldAt < :to
          AND a.status = 'COMPLETED'
          AND (:storeId IS NULL OR a.store.id = :storeId)
        ORDER BY a.soldAt DESC
    """)
    List<AccessorySale> findSalesBetweenWithDetails(
        @Param("from") Instant from,
        @Param("to") Instant to,
        @Param("storeId") UUID storeId
    );

    @Query(value = """
        SELECT a FROM AccessorySale a
        LEFT JOIN FETCH a.customer
        LEFT JOIN FETCH a.soldBy
        LEFT JOIN FETCH a.store
        WHERE (:storeId IS NULL OR a.store.id = :storeId)
          AND (LOWER(a.billNumber) LIKE LOWER(CONCAT('%', :q, '%'))
            OR a.customerMobile LIKE CONCAT('%', :q, '%')
            OR LOWER(a.customerName) LIKE LOWER(CONCAT('%', :q, '%'))
            OR LOWER(a.accessoryName) LIKE LOWER(CONCAT('%', :q, '%'))
            OR LOWER(COALESCE(a.serialNumber, '')) LIKE LOWER(CONCAT('%', :q, '%')))
        ORDER BY a.soldAt DESC
    """, countQuery = """
        SELECT count(a) FROM AccessorySale a
        WHERE (:storeId IS NULL OR a.store.id = :storeId)
          AND (LOWER(a.billNumber) LIKE LOWER(CONCAT('%', :q, '%'))
            OR a.customerMobile LIKE CONCAT('%', :q, '%')
            OR LOWER(a.customerName) LIKE LOWER(CONCAT('%', :q, '%'))
            OR LOWER(a.accessoryName) LIKE LOWER(CONCAT('%', :q, '%'))
            OR LOWER(COALESCE(a.serialNumber, '')) LIKE LOWER(CONCAT('%', :q, '%')))
    """)
    Page<AccessorySale> searchByStore(@Param("q") String query, @Param("storeId") UUID storeId, Pageable pageable);

    @Query(value = """
        SELECT a FROM AccessorySale a
        LEFT JOIN FETCH a.customer
        LEFT JOIN FETCH a.soldBy
        LEFT JOIN FETCH a.store
        WHERE LOWER(a.billNumber) LIKE LOWER(CONCAT('%', :q, '%'))
           OR a.customerMobile LIKE CONCAT('%', :q, '%')
           OR LOWER(a.customerName) LIKE LOWER(CONCAT('%', :q, '%'))
           OR LOWER(a.accessoryName) LIKE LOWER(CONCAT('%', :q, '%'))
           OR LOWER(COALESCE(a.serialNumber, '')) LIKE LOWER(CONCAT('%', :q, '%'))
        ORDER BY a.soldAt DESC
    """, countQuery = """
        SELECT count(a) FROM AccessorySale a
        WHERE LOWER(a.billNumber) LIKE LOWER(CONCAT('%', :q, '%'))
           OR a.customerMobile LIKE CONCAT('%', :q, '%')
           OR LOWER(a.customerName) LIKE LOWER(CONCAT('%', :q, '%'))
           OR LOWER(a.accessoryName) LIKE LOWER(CONCAT('%', :q, '%'))
           OR LOWER(COALESCE(a.serialNumber, '')) LIKE LOWER(CONCAT('%', :q, '%'))
    """)
    Page<AccessorySale> search(@Param("q") String query, Pageable pageable);
}
