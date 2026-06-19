package com.famousmobiles.service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Instant;
import java.util.Comparator;
import java.util.HexFormat;
import java.util.UUID;

import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.famousmobiles.config.AppProperties;
import com.famousmobiles.domain.RefreshToken;
import com.famousmobiles.domain.Technician;
import com.famousmobiles.domain.User;
import com.famousmobiles.domain.enums.UserRole;
import com.famousmobiles.dto.AuthResponse;
import com.famousmobiles.dto.CreateUserRequest;
import com.famousmobiles.dto.LoginRequest;
import com.famousmobiles.dto.UpdateUserRequest;
import com.famousmobiles.dto.UserResponse;
import com.famousmobiles.exception.BadRequestException;
import com.famousmobiles.exception.ForbiddenException;
import com.famousmobiles.exception.ResourceNotFoundException;
import com.famousmobiles.repository.RefreshTokenRepository;
import com.famousmobiles.repository.TechnicianRepository;
import com.famousmobiles.repository.UserRepository;
import com.famousmobiles.security.JwtService;
import com.famousmobiles.security.SecurityUtils;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final TechnicianRepository technicianRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final AuthenticationManager authenticationManager;
    private final SecurityUtils securityUtils;

    public AuthService(UserRepository userRepository, RefreshTokenRepository refreshTokenRepository,
            TechnicianRepository technicianRepository, PasswordEncoder passwordEncoder, JwtService jwtService,
            AuthenticationManager authenticationManager, SecurityUtils securityUtils) {
        this.userRepository = userRepository;
        this.refreshTokenRepository = refreshTokenRepository;
        this.technicianRepository = technicianRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.authenticationManager = authenticationManager;
        this.securityUtils = securityUtils;
    }

    public AuthResponse login(LoginRequest request) {
        String mobile = normalizeMobile(request.mobile());
        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(mobile, request.password()));
        User user = userRepository.findByMobile(mobile)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        if (!user.isActive()) {
            throw new ForbiddenException("Account is deactivated");
        }
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
        if (!user.isActive()) {
            throw new ForbiddenException("Account is deactivated");
        }
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
        validateStaffRole(request.role());
        String mobile = normalizeMobile(request.mobile());
        var existing = userRepository.findByMobile(mobile);
        if (existing.isPresent()) {
            User user = existing.get();
            if (user.isActive()) {
                throw new BadRequestException("Mobile number already registered");
            }
            user.setFullName(request.fullName().trim());
            user.setPasswordHash(passwordEncoder.encode(request.password()));
            user.setRole(request.role());
            user.setEmail(staffEmail(mobile));
            user.setActive(true);
            user.setMustChangePassword(false);
            user = userRepository.save(user);
            syncTechnicianProfile(user);
            return toUserResponse(user);
        }
        User user = new User();
        user.setMobile(mobile);
        user.setEmail(staffEmail(mobile));
        user.setPasswordHash(passwordEncoder.encode(request.password()));
        user.setFullName(request.fullName().trim());
        user.setRole(request.role());
        user.setActive(true);
        user.setMustChangePassword(false);
        user = userRepository.save(user);
        syncTechnicianProfile(user);
        return toUserResponse(user);
    }

    @Transactional
    public UserResponse updateUser(UUID id, UpdateUserRequest request) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Staff member not found"));
        validateStaffRole(request.role());
        String mobile = normalizeMobile(request.mobile());
        userRepository.findByMobile(mobile).ifPresent(existing -> {
            if (!existing.getId().equals(id) && existing.isActive()) {
                throw new BadRequestException("Mobile number already registered");
            }
        });
        user.setFullName(request.fullName().trim());
        user.setMobile(mobile);
        user.setEmail(staffEmail(mobile));
        user.setRole(request.role());
        if (request.password() != null && !request.password().isBlank()) {
            user.setPasswordHash(passwordEncoder.encode(request.password()));
        }
        user = userRepository.save(user);
        syncTechnicianProfile(user);
        return toUserResponse(user);
    }

    @Transactional
    public void deleteUser(UUID id) {
        User current = securityUtils.getCurrentUser();
        if (current.getId().equals(id)) {
            throw new BadRequestException("You cannot remove your own account");
        }
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Staff member not found"));
        if (user.getRole() == UserRole.ADMIN) {
            throw new BadRequestException("Admin accounts cannot be removed from here");
        }
        if (!user.isActive()) {
            return;
        }
        user.setActive(false);
        userRepository.save(user);
        syncTechnicianProfile(user);
    }

    @Transactional
    public void permanentlyDeleteUser(UUID id) {
        User current = securityUtils.getCurrentUser();
        if (current.getId().equals(id)) {
            throw new BadRequestException("You cannot delete your own account");
        }
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Staff member not found"));
        if (user.getRole() == UserRole.ADMIN) {
            throw new BadRequestException("Admin accounts cannot be permanently deleted");
        }
        if (user.isActive()) {
            throw new BadRequestException("Remove the staff member first before permanent delete");
        }
        refreshTokenRepository.deleteByUserId(id);
        technicianRepository.clearUserReferenceByUserId(id);
        userRepository.delete(user);
    }

    public java.util.List<UserResponse> listUsers() {
        return userRepository.findAll().stream()
                .sorted(Comparator.comparing(User::getCreatedAt).reversed())
                .map(this::toUserResponse)
                .toList();
    }

    @Transactional
    public void seedAdmin(AppProperties appProperties) {
        if (userRepository.existsByEmail(appProperties.admin().email())) {
            userRepository.findByEmail(appProperties.admin().email()).ifPresent(admin -> {
                boolean dirty = false;
                String configuredMobile = normalizeMobile(appProperties.admin().mobile());
                if (admin.getMobile() == null || admin.getMobile().isBlank()) {
                    admin.setMobile(configuredMobile);
                    dirty = true;
                }
                if (appProperties.admin().syncOnStart()) {
                    admin.setPasswordHash(passwordEncoder.encode(appProperties.admin().password()));
                    admin.setActive(true);
                    dirty = true;
                }
                if (dirty) {
                    userRepository.save(admin);
                }
            });
            return;
        }
        String mobile = normalizeMobile(appProperties.admin().mobile());
        User admin = new User();
        admin.setEmail(appProperties.admin().email());
        admin.setMobile(mobile);
        admin.setPasswordHash(passwordEncoder.encode(appProperties.admin().password()));
        admin.setFullName("System Admin");
        admin.setRole(UserRole.ADMIN);
        admin.setActive(true);
        admin.setMustChangePassword(true);
        userRepository.save(admin);
    }

    private AuthResponse buildAuthResponse(User user) {
        String accessToken = jwtService.generateAccessToken(user.getId(), user.getMobile(), user.getRole().name());
        String refreshToken = jwtService.generateRefreshToken(user.getId());
        RefreshToken entity = new RefreshToken();
        entity.setUser(user);
        entity.setTokenHash(hashToken(refreshToken));
        entity.setExpiresAt(Instant.now().plusMillis(604800000));
        refreshTokenRepository.save(entity);
        return new AuthResponse(accessToken, refreshToken, user.getMobile(), user.getFullName(),
                user.getRole(), user.isMustChangePassword());
    }

    private UserResponse toUserResponse(User user) {
        return new UserResponse(user.getId(), user.getMobile(), user.getFullName(),
                user.getRole(), user.isActive(), user.isMustChangePassword(), user.getCreatedAt().toString());
    }

    private void validateStaffRole(UserRole role) {
        if (role != UserRole.SALESMAN && role != UserRole.TECHNICIAN) {
            throw new BadRequestException("Only Salesman and Technician roles can be managed here");
        }
    }

    private void syncTechnicianProfile(User user) {
        if (user.getRole() != UserRole.TECHNICIAN) {
            deactivateTechnicianProfile(user);
            return;
        }
        Technician technician = technicianRepository.findByUserId(user.getId()).orElseGet(() -> {
            Technician created = new Technician();
            created.setUser(user);
            return created;
        });
        technician.setName(user.getFullName());
        technician.setMobile(user.getMobile());
        technician.setActive(user.isActive());
        technicianRepository.save(technician);
    }

    private void deactivateTechnicianProfile(User user) {
        technicianRepository.findByUserId(user.getId()).ifPresent(technician -> {
            technician.setActive(false);
            technicianRepository.save(technician);
        });
    }

    private String normalizeMobile(String mobile) {
        return mobile.trim().replaceAll("\\s+", "");
    }

    private String staffEmail(String mobile) {
        return mobile + "@staff.famousmobiles.internal";
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
