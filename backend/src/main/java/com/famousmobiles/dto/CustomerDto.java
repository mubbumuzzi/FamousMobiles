package com.famousmobiles.dto;

import java.util.UUID;

import com.famousmobiles.domain.Customer;

import jakarta.validation.constraints.NotBlank;

public final class CustomerDto {

    private CustomerDto() {}

    public record CustomerRequest(
            @NotBlank String fullName,
            @NotBlank String mobile,
            String alternateMobile,
            String address,
            String area,
            String city,
            String notes
    ) {}

    public record CustomerResponse(
            UUID id,
            String customerCode,
            String fullName,
            String mobile,
            String alternateMobile,
            String address,
            String area,
            String city,
            String notes,
            String createdAt
    ) {
        public static CustomerResponse from(Customer c) {
            return new CustomerResponse(
                    c.getId(),
                    c.getCustomerCode(),
                    c.getFullName(),
                    c.getMobile(),
                    c.getAlternateMobile(),
                    c.getAddress(),
                    c.getArea(),
                    c.getCity(),
                    c.getNotes(),
                    c.getCreatedAt().toString()
            );
        }
    }
}
