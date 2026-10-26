package com.famousmobiles.repository;

import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.famousmobiles.domain.StockOrder;
import com.famousmobiles.domain.enums.StockOrderStatus;

@Repository
public interface StockOrderRepository extends JpaRepository<StockOrder, UUID> {
    List<StockOrder> findByStatusInOrderByCreatedAtDesc(List<StockOrderStatus> statuses);
    List<StockOrder> findByStatusOrderByCreatedAtDesc(StockOrderStatus status);
    List<StockOrder> findAllByOrderByCreatedAtDesc();
    long countByStatus(StockOrderStatus status);
}
