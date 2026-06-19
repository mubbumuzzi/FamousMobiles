package com.famousmobiles.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import com.famousmobiles.domain.enums.UserRole;

public record UpdateUserRequest(
        @NotBlank String fullName,
        @NotBlank String mobile,
        String password,
        @NotNull UserRole role
) {}
