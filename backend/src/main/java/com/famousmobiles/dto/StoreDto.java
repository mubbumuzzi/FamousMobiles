package com.famousmobiles.dto;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import com.famousmobiles.domain.Store;

public class StoreDto {

    public record StoreResponse(
            UUID id,
            String code,
            String name,
            String displayName,
            String mobile,
            String alternateMobile,
            String ownerName,
            String addressLine1,
            String addressLine2,
            String city,
            String pincode,
            List<String> addressLines,
            List<String> terms,
            boolean active
    ) {
        public static StoreResponse from(Store s) {
            List<String> lines = new ArrayList<>();
            if (s.getAddressLine1() != null && !s.getAddressLine1().isBlank()) {
                lines.add(s.getAddressLine1());
            }
            if (s.getAddressLine2() != null && !s.getAddressLine2().isBlank()) {
                lines.add(s.getAddressLine2());
            }
            StringBuilder cityLine = new StringBuilder();
            if (s.getCity() != null && !s.getCity().isBlank()) {
                cityLine.append(s.getCity());
            }
            if (s.getPincode() != null && !s.getPincode().isBlank()) {
                if (!cityLine.isEmpty()) cityLine.append(" - ");
                cityLine.append(s.getPincode());
            }
            if (!cityLine.isEmpty()) {
                lines.add(cityLine.toString());
            }

            return new StoreResponse(
                    s.getId(),
                    s.getCode(),
                    s.getName(),
                    s.getDisplayName(),
                    s.getMobile(),
                    s.getAlternateMobile(),
                    s.getOwnerName(),
                    s.getAddressLine1(),
                    s.getAddressLine2(),
                    s.getCity(),
                    s.getPincode(),
                    lines,
                    s.getTerms() != null ? s.getTerms() : List.of(),
                    s.isActive()
            );
        }
    }

    public record UpdateStoreRequest(
            String name,
            String displayName,
            String mobile,
            String alternateMobile,
            String ownerName,
            String addressLine1,
            String addressLine2,
            String city,
            String pincode,
            List<String> terms
    ) {}
}
