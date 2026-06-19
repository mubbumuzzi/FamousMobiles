package com.famousmobiles.repository;

import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import com.famousmobiles.domain.InventoryTransaction;

public interface InventoryTransactionRepository extends JpaRepository<InventoryTransaction, UUID> {
}
