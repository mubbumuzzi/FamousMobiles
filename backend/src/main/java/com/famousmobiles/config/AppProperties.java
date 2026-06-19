package com.famousmobiles.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app")
public record AppProperties(
        Jwt jwt,
        String uploadDir,
        String publicAppUrl,
        Admin admin,
        Cors cors,
        Shop shop
) {
    public record Jwt(
            String secret,
            String refreshSecret,
            long accessTokenExpirationMs,
            long refreshTokenExpirationMs
    ) {}

    public record Admin(String email, String password, String mobile, boolean syncOnStart) {}

    public record Cors(String allowedOrigins) {}

    public record Shop(
            String name,
            String ownerName,
            String mobile,
            java.util.List<String> addressLines,
            java.util.List<String> terms
    ) {}
}
