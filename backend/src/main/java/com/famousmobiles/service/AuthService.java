package com.famousmobiles.service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Instant;
import java.util.HexFormat;
import java.util.UUID;

import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.famousmobiles.config.AppProperties;
import com.famousmobiles.domain.RefreshToken;
import com.famousmobiles.domain.User;
import com.famousmobiles.domain.enums.UserRole;
import com.famousmobiles.dto.AuthResponse;
import com.famousmobiles.dto.CreateUserRequest;
import com.famousmobiles.dto.LoginRequest;
import com.famousmobiles.dto.UserResponse;
import com.famousmobiles.exception.BadRequestException;
import com.famousmobiles.exception.ResourceNotFoundException;
import com.famousmobiles.repository.RefreshTokenRepository;
import com.famousmobiles.repository.UserRepository;
import com.famousmobiles.security.JwtService;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final AuthenticationManager authenticationManager;

    public AuthService(UserRepository userRepository, RefreshTokenRepository refreshTokenRepository,
            PasswordEncoder passwordEncoder, JwtService jwtService, AuthenticationManager authenticationManager) {
        this.userRepository = userRepository;
        this.refreshTokenRepository = refreshTokenRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.authenticationManager = authenticationManager;
    }

    public AuthResponse login(LoginRequest request) {
        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.email(), request.password()));
        User user = userRepository.findByEmail(request.email())
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        return buildAuthResponse(user);
    }

    @Transactional
    public AuthResponse refresh(String refreshToken) {
        var claims = jwtService.parseRefreshToken(refreshToken);
        String hash = hashToken(refreshToken);
        RefreshToken stored = refreshTokenRepository.findByTokenHash(hash)
                .orElseThrow(() -> new BadRequestException("Invalid refresh token"));
        if (stored.isRevoked() || stored.getExpiresAt().isBefore(Instant.now())) {
            throw new BadRequestException("Refresh token expired");
        }
        stored.setRevoked(true);
        refreshTokenRepository.save(stored);
        User user = stored.getUser();
        return buildAuthResponse(user);
    }

    @Transactional
    public void logout(String refreshToken) {
        refreshTokenRepository.findByTokenHash(hashToken(refreshToken)).ifPresent(token -> {
            token.setRevoked(true);
            refreshTokenRepository.save(token);
        });
    }

    @Transactional
    public UserResponse createUser(CreateUserRequest request) {
        if (userRepository.existsByEmail(request.email())) {
            throw new BadRequestException("Email already exists");
        }
        User user = new User();
        user.setEmail(request.email());
        user.setPasswordHash(passwordEncoder.encode(request.password()));
        user.setFullName(request.fullName());
        user.setRole(request.role());
        user.setActive(true);
        user = userRepository.save(user);
        return toUserResponse(user);
    }

    public java.util.List<UserResponse> listUsers() {
        return userRepository.findAll().stream().map(this::toUserResponse).toList();
    }

    @Transactional
    public void seedAdmin(AppProperties appProperties) {
        if (userRepository.existsByEmail(appProperties.admin().email())) {
            return;
        }
        User admin = new User();
        admin.setEmail(appProperties.admin().email());
        admin.setPasswordHash(passwordEncoder.encode(appProperties.admin().password()));
        admin.setFullName("System Admin");
        admin.setRole(UserRole.ADMIN);
        admin.setActive(true);
        admin.setMustChangePassword(true);
        userRepository.save(admin);
    }

    private AuthResponse buildAuthResponse(User user) {
        String accessToken = jwtService.generateAccessToken(user.getId(), user.getEmail(), user.getRole().name());
        String refreshToken = jwtService.generateRefreshToken(user.getId());
        RefreshToken entity = new RefreshToken();
        entity.setUser(user);
        entity.setTokenHash(hashToken(refreshToken));
        entity.setExpiresAt(Instant.now().plusMillis(604800000));
        refreshTokenRepository.save(entity);
        return new AuthResponse(accessToken, refreshToken, user.getEmail(), user.getFullName(),
                user.getRole(), user.isMustChangePassword());
    }

    private UserResponse toUserResponse(User user) {
        return new UserResponse(user.getId(), user.getEmail(), user.getFullName(),
                user.getRole(), user.isActive(), user.isMustChangePassword());
    }

    private String hashToken(String token) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(digest.digest(token.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
    }
}
