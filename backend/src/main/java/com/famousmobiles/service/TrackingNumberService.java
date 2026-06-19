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
    public String generateTrackingNumber() {
        int year = Year.now().getValue();
        Long next = jdbcTemplate.queryForObject("""
            INSERT INTO tracking_number_sequences (year, last_value)
            VALUES (?, 1)
            ON CONFLICT (year) DO UPDATE SET last_value = tracking_number_sequences.last_value + 1
            RETURNING last_value
            """, Long.class, year);
        return String.format("FM-%d-%06d", year, next);
    }

    @Transactional
    public String generateCustomerCode() {
        Long next = jdbcTemplate.queryForObject("""
            UPDATE customer_code_sequences SET last_value = last_value + 1 WHERE id = 1 RETURNING last_value
            """, Long.class);
        return String.format("CUST-%06d", next);
    }
}
