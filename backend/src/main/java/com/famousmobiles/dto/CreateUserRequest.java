package com.famousmobiles.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import com.famousmobiles.domain.enums.UserRole;

public record CreateUserRequest(
        @NotBlank String fullName,
        @NotBlank String mobile,
        @NotBlank String password,
        @NotNull UserRole role,
        Boolean doorstepEnabled
) {}
