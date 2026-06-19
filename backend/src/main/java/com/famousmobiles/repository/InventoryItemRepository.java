package com.famousmobiles.repository;

import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import com.famousmobiles.domain.InventoryItem;

public interface InventoryItemRepository extends JpaRepository<InventoryItem, UUID> {
    @Query("SELECT i FROM InventoryItem i WHERE i.quantity <= i.lowStockThreshold ORDER BY i.quantity ASC")
    List<InventoryItem> findLowStockItems();
}
