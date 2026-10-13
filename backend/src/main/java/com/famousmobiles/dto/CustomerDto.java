package com.famousmobiles.dto;

import java.util.List;
import java.util.UUID;

import com.famousmobiles.domain.Customer;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;

import jakarta.validation.constraints.Size;

public final class CustomerDto {

    private CustomerDto() {}

    public record MobileEntry(
            @NotBlank String number,
            String label,
            Boolean isPrimary
    ) {}

    public record CustomerRequest(
            @NotBlank @Size(min = 4, message = "Full name must be at least 4 characters") String fullName,
            @Valid List<MobileEntry> mobiles,
            String mobile,
            String alternateMobile,
            String address,
            String area,
            String city,
            String notes
    ) {
        public List<MobileEntry> resolveMobiles() {
            if (mobiles != null && !mobiles.isEmpty()) {
                return mobiles;
            }
            if (mobile != null && !mobile.isBlank()) {
                java.util.List<MobileEntry> list = new java.util.ArrayList<>();
                list.add(new MobileEntry(mobile.trim(), "Primary", true));
                if (alternateMobile != null && !alternateMobile.isBlank()) {
                    list.add(new MobileEntry(alternateMobile.trim(), "Alternate", false));
                }
                return list;
            }
            return java.util.List.of();
        }
    }

    public record CustomerResponse(
            UUID id,
            String customerCode,
            String fullName,
            String mobile,
            String alternateMobile,
            List<MobileEntry> mobiles,
            String address,
            String area,
            String city,
            String notes,
            String createdAt,
            String matchedMobile
    ) {
        public static CustomerResponse from(Customer c) {
            return from(c, null);
        }

        public static CustomerResponse from(Customer c, String matchedMobile) {
            List<MobileEntry> mobiles = c.getPhones().stream()
                    .map(p -> new MobileEntry(p.getMobile(), p.getLabel(), p.isPrimary()))
                    .toList();
            String altMobile = mobiles.stream()
                    .filter(m -> !Boolean.TRUE.equals(m.isPrimary()))
                    .map(MobileEntry::number)
                    .findFirst()
                    .orElse(null);
            return new CustomerResponse(
                    c.getId(),
                    c.getCustomerCode(),
                    c.getFullName(),
                    c.getMobile(),
                    altMobile,
                    mobiles,
                    c.getAddress(),
                    c.getArea(),
                    c.getCity(),
                    c.getNotes(),
                    c.getCreatedAt() != null ? c.getCreatedAt().toString() : java.time.Instant.now().toString(),
                    matchedMobile
            );
        }
    }
}
