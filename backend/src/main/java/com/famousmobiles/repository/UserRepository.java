package com.famousmobiles.repository;

import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import com.famousmobiles.domain.User;
import com.famousmobiles.domain.enums.UserRole;

public interface UserRepository extends JpaRepository<User, UUID> {
    Optional<User> findByEmail(String email);
    Optional<User> findByMobile(String mobile);
    boolean existsByEmail(String email);
    boolean existsByMobile(String mobile);
    boolean existsByMobileAndActiveTrue(String mobile);
    long countByRoleAndActiveTrue(UserRole role);
}
