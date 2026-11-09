package com.famousmobiles;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.io.IOException;
import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.core.context.SecurityContextHolder;

import com.famousmobiles.domain.User;
import com.famousmobiles.domain.enums.UserRole;
import com.famousmobiles.repository.UserRepository;
import com.famousmobiles.security.JwtAuthenticationFilter;
import com.famousmobiles.security.JwtService;
import com.famousmobiles.security.UserPrincipal;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import jakarta.servlet.ServletException;

@ExtendWith(MockitoExtension.class)
class JwtAuthenticationFilterTest {

    @Mock
    private JwtService jwtService;

    @Mock
    private UserRepository userRepository;

    private JwtAuthenticationFilter filter;

    @BeforeEach
    void setUp() {
        filter = new JwtAuthenticationFilter(jwtService, userRepository);
        SecurityContextHolder.clearContext();
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void doFilter_validBearerToken_setsSecurityContextAuthentication() throws ServletException, IOException {
        UUID userId = UUID.randomUUID();
        String token = "valid-test-access-token";

        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader("Authorization", "Bearer " + token);
        MockHttpServletResponse response = new MockHttpServletResponse();
        MockFilterChain chain = new MockFilterChain();

        Claims claims = mock(Claims.class);
        when(claims.getSubject()).thenReturn(userId.toString());
        when(jwtService.parseAccessToken(token)).thenReturn(claims);

        User user = new User();
        user.setId(userId);
        user.setMobile("9063786751");
        user.setFullName("Mubasheer Staff");
        user.setRole(UserRole.ADMIN);
        user.setActive(true);

        when(userRepository.findById(userId)).thenReturn(Optional.of(user));

        filter.doFilter(request, response, chain);

        assertNotNull(SecurityContextHolder.getContext().getAuthentication());
        UserPrincipal principal = (UserPrincipal) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        assertEquals(userId, principal.getUser().getId());
        assertEquals("9063786751", principal.getUsername());
    }

    @Test
    void doFilter_queryParameterToken_shouldNOTAuthenticate() throws ServletException, IOException {
        String token = "sneaky-query-param-token";

        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setParameter("token", token); // Token in URL query string
        MockHttpServletResponse response = new MockHttpServletResponse();
        MockFilterChain chain = new MockFilterChain();

        filter.doFilter(request, response, chain);

        // Security assertion: query parameter token must be rejected/ignored completely!
        assertNull(SecurityContextHolder.getContext().getAuthentication(),
                "SecurityContextHolder MUST NOT be authenticated when token is passed via query parameter");
    }

    @Test
    void doFilter_missingAuthorizationHeader_continuesChainWithoutAuth() throws ServletException, IOException {
        MockHttpServletRequest request = new MockHttpServletRequest();
        MockHttpServletResponse response = new MockHttpServletResponse();
        MockFilterChain chain = new MockFilterChain();

        filter.doFilter(request, response, chain);

        assertNull(SecurityContextHolder.getContext().getAuthentication());
    }

    @Test
    void doFilter_nonBearerAuthorizationHeader_continuesChainWithoutAuth() throws ServletException, IOException {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader("Authorization", "Basic YWRtaW46cGFzc3dvcmQ=");
        MockHttpServletResponse response = new MockHttpServletResponse();
        MockFilterChain chain = new MockFilterChain();

        filter.doFilter(request, response, chain);

        assertNull(SecurityContextHolder.getContext().getAuthentication());
    }

    @Test
    void doFilter_invalidJwtException_clearsContextSafely() throws ServletException, IOException {
        String token = "malformed-tampered-token";

        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader("Authorization", "Bearer " + token);
        MockHttpServletResponse response = new MockHttpServletResponse();
        MockFilterChain chain = new MockFilterChain();

        when(jwtService.parseAccessToken(token)).thenThrow(new JwtException("Signature tampered"));

        filter.doFilter(request, response, chain);

        assertNull(SecurityContextHolder.getContext().getAuthentication());
    }

    @Test
    void doFilter_deactivatedUser_shouldNotAuthenticate() throws ServletException, IOException {
        UUID userId = UUID.randomUUID();
        String token = "valid-token-for-inactive-user";

        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader("Authorization", "Bearer " + token);
        MockHttpServletResponse response = new MockHttpServletResponse();
        MockFilterChain chain = new MockFilterChain();

        Claims claims = mock(Claims.class);
        when(claims.getSubject()).thenReturn(userId.toString());
        when(jwtService.parseAccessToken(token)).thenReturn(claims);

        User inactiveUser = new User();
        inactiveUser.setId(userId);
        inactiveUser.setActive(false); // Inactive account!

        when(userRepository.findById(userId)).thenReturn(Optional.of(inactiveUser));

        filter.doFilter(request, response, chain);

        assertNull(SecurityContextHolder.getContext().getAuthentication(),
                "Deactivated user must NOT be granted authentication");
    }
}
