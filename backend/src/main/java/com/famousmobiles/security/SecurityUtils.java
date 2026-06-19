package com.famousmobiles.security;

import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

import com.famousmobiles.domain.User;
import com.famousmobiles.domain.enums.UserRole;
import com.famousmobiles.exception.ForbiddenException;
import com.famousmobiles.repository.UserRepository;

@Component
public class SecurityUtils {

    private final UserRepository userRepository;

    public SecurityUtils(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    /** Returns a persistence-context-managed User for DB writes and role checks. */
    public User getCurrentUser() {
        var authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !(authentication.getPrincipal() instanceof UserPrincipal principal)) {
            throw new ForbiddenException("Not authenticated");
        }
        return userRepository.findById(principal.getUser().getId())
                .orElseThrow(() -> new ForbiddenException("Not authenticated"));
    }

    public boolean hasRole(UserRole role) {
        return getCurrentUser().getRole() == role;
    }

    public boolean isAdmin() {
        return hasRole(UserRole.ADMIN);
    }
}
