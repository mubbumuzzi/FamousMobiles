package com.famousmobiles.repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.famousmobiles.domain.Customer;
import com.famousmobiles.domain.CustomerPhone;

public interface CustomerRepository extends JpaRepository<Customer, UUID> {
    Optional<Customer> findByMobile(String mobile);

    @Query("SELECT c FROM Customer c JOIN c.phones p WHERE p.mobile = :mobile")
    Optional<Customer> findByAnyPhone(@Param("mobile") String mobile);

    @Query("SELECT p FROM CustomerPhone p WHERE p.mobile = :mobile")
    Optional<CustomerPhone> findPhoneByMobile(@Param("mobile") String mobile);

    @Query("""
        SELECT DISTINCT c FROM Customer c
        LEFT JOIN c.phones p
        WHERE LOWER(c.fullName) LIKE LOWER(CONCAT('%', :q, '%'))
           OR c.mobile LIKE CONCAT('%', :q, '%')
           OR p.mobile LIKE CONCAT('%', :q, '%')
           OR c.customerCode LIKE CONCAT('%', :q, '%')
        """)
    List<Customer> search(@Param("q") String query);
}
