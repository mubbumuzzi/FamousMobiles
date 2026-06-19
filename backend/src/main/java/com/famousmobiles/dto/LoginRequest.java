package com.famousmobiles.dto;

import jakarta.validation.constraints.NotBlank;

public record LoginRequest(
        @NotBlank String mobile,
        @NotBlank String password
) {}
