package com.famousmobiles.dto;

import java.util.UUID;

import com.famousmobiles.domain.enums.UserRole;

public record UserResponse(
        UUID id,
        String email,
        String fullName,
        UserRole role,
        boolean active,
        boolean mustChangePassword
) {}
