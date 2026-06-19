package com.famousmobiles.dto;

import com.famousmobiles.domain.enums.UserRole;

public record AuthResponse(
        String accessToken,
        String refreshToken,
        String email,
        String fullName,
        UserRole role,
        boolean mustChangePassword
) {}
