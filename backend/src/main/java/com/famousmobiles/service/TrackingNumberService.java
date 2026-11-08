package com.famousmobiles.service;

import java.time.Year;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class TrackingNumberService {

    private final JdbcTemplate jdbcTemplate;

    public TrackingNumberService(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @Transactional
    public String generateTrackingNumber(String storeCode) {
        int year = Year.now().getValue();
        String prefix = (storeCode != null && !storeCode.isBlank()) ? storeCode.trim().toUpperCase() : "FM1";
        Long next = jdbcTemplate.queryForObject("""
            INSERT INTO store_tracking_sequences (store_code, year, last_value)
            VALUES (?, ?, 1)
            ON CONFLICT (store_code, year) DO UPDATE SET last_value = store_tracking_sequences.last_value + 1
            RETURNING last_value
            """, Long.class, prefix, year);
        return String.format("%s-%d-%06d", prefix, year, next);
    }

    @Transactional
    public String generateTrackingNumber() {
        return generateTrackingNumber("FM1");
    }

    @Transactional
    public String generateCustomerCode() {
        Long next = jdbcTemplate.queryForObject("""
            UPDATE customer_code_sequences SET last_value = last_value + 1 WHERE id = 1 RETURNING last_value
            """, Long.class);
        return String.format("CUST-%06d", next);
    }

    @Transactional
    public String generateStockOrderCode() {
        int year = Year.now().getValue();
        Long next = jdbcTemplate.queryForObject("""
            INSERT INTO stock_order_sequences (year, last_value)
            VALUES (?, 1)
            ON CONFLICT (year) DO UPDATE SET last_value = stock_order_sequences.last_value + 1
            RETURNING last_value
            """, Long.class, year);
        return String.format("ORD-%d-%04d", year, next);
    }
}
