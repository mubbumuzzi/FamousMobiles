package com.famousmobiles.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app")
public record AppProperties(
        Jwt jwt,
        String uploadDir,
        String publicAppUrl,
        Admin admin,
        Cors cors
) {
    public record Jwt(
            String secret,
            String refreshSecret,
            long accessTokenExpirationMs,
            long refreshTokenExpirationMs
    ) {}

    public record Admin(String email, String password, String mobile) {}

    public record Cors(String allowedOrigins) {}
}
