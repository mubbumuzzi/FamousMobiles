package com.famousmobiles.repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import com.famousmobiles.domain.Store;

public interface StoreRepository extends JpaRepository<Store, UUID> {
    List<Store> findByActiveTrueOrderByCodeAsc();
    Optional<Store> findByCode(String code);
    Optional<Store> findByCodeIgnoreCase(String code);
}
