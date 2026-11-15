package com.famousmobiles;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import com.famousmobiles.domain.User;
import com.famousmobiles.domain.enums.UserRole;
import com.famousmobiles.dto.UserResponse;
import com.famousmobiles.repository.RefreshTokenRepository;
import com.famousmobiles.repository.TechnicianRepository;
import com.famousmobiles.repository.UserRepository;
import com.famousmobiles.security.JwtService;
import com.famousmobiles.security.SecurityUtils;
import com.famousmobiles.service.AuthService;

@ExtendWith(MockitoExtension.class)
class UserDoorstepPermissionTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private RefreshTokenRepository refreshTokenRepository;

    @Mock
    private TechnicianRepository technicianRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private JwtService jwtService;

    @Mock
    private SecurityUtils securityUtils;

    @Mock
    private org.springframework.security.authentication.AuthenticationManager authenticationManager;

    private AuthService authService;

    @BeforeEach
    void setUp() {
        authService = new AuthService(
                userRepository,
                refreshTokenRepository,
                technicianRepository,
                passwordEncoder,
                jwtService,
                authenticationManager,
                securityUtils
        );
    }

    @Test
    void user_adminOrSysAdminMobile_alwaysHasDoorstepEnabled() {
        // Admin role user
        User admin = new User();
        admin.setRole(UserRole.ADMIN);
        admin.setMobile("9999999999");
        admin.setDoorstepEnabled(false);
        assertTrue(admin.isDoorstepEnabled(), "Admin role must always have doorstep enabled");

        // Specific sys admin mobile 6302255467
        User sysAdmin = new User();
        sysAdmin.setRole(UserRole.SALESMAN);
        sysAdmin.setMobile("6302255467");
        sysAdmin.setDoorstepEnabled(false);
        assertTrue(sysAdmin.isDoorstepEnabled(), "System admin mobile 6302255467 must always have doorstep enabled");

        // Regular technician with doorstep disabled
        User tech = new User();
        tech.setRole(UserRole.TECHNICIAN);
        tech.setMobile("9876543210");
        tech.setDoorstepEnabled(false);
        assertFalse(tech.isDoorstepEnabled(), "Technician with false flag must have doorstep disabled");

        // Regular technician with doorstep enabled
        tech.setDoorstepEnabled(true);
        assertTrue(tech.isDoorstepEnabled(), "Technician with true flag must have doorstep enabled");
    }

    @Test
    void toggleDoorstepAccess_updatesStaffDoorstepPermission() {
        UUID techId = UUID.randomUUID();
        User tech = new User();
        tech.setId(techId);
        tech.setRole(UserRole.TECHNICIAN);
        tech.setMobile("9876543210");
        tech.setFullName("John Tech");
        tech.setActive(true);
        tech.setDoorstepEnabled(false);

        when(userRepository.findById(techId)).thenReturn(Optional.of(tech));
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));

        // Enable doorstep
        UserResponse enabledResp = authService.toggleDoorstepAccess(techId, true);
        assertTrue(enabledResp.doorstepEnabled());
        assertTrue(tech.isDoorstepEnabled());

        // Disable doorstep
        UserResponse disabledResp = authService.toggleDoorstepAccess(techId, false);
        assertFalse(disabledResp.doorstepEnabled());
        assertFalse(tech.isDoorstepEnabled());

        verify(userRepository, org.mockito.Mockito.times(2)).save(tech);
    }

    @Test
    void toggleDoorstepAccess_adminAndSysAdminCannotBeDisabled() {
        UUID sysAdminId = UUID.randomUUID();
        User sysAdmin = new User();
        sysAdmin.setId(sysAdminId);
        sysAdmin.setRole(UserRole.ADMIN);
        sysAdmin.setMobile("6302255467");
        sysAdmin.setFullName("System Admin");
        sysAdmin.setActive(true);
        sysAdmin.setDoorstepEnabled(true);

        when(userRepository.findById(sysAdminId)).thenReturn(Optional.of(sysAdmin));
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));

        // Attempting to disable doorstep on system admin must remain true
        UserResponse response = authService.toggleDoorstepAccess(sysAdminId, false);
        assertTrue(response.doorstepEnabled(), "Admin / 6302255467 cannot be disabled");
        assertTrue(sysAdmin.isDoorstepEnabled());
    }
}
