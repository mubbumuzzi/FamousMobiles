package com.famousmobiles.dto;

import java.util.UUID;

import com.famousmobiles.domain.enums.UserRole;

public record UserResponse(
        UUID id,
        String mobile,
        String fullName,
        UserRole role,
        boolean active,
        boolean mustChangePassword,
        String createdAt
) {}
