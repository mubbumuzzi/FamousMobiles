package com.famousmobiles.security;

import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

import com.famousmobiles.domain.User;
import com.famousmobiles.domain.enums.UserRole;
import com.famousmobiles.exception.ForbiddenException;

@Component
public class SecurityUtils {

    public User getCurrentUser() {
        var authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !(authentication.getPrincipal() instanceof UserPrincipal principal)) {
            throw new ForbiddenException("Not authenticated");
        }
        return principal.getUser();
    }

    public boolean hasRole(UserRole role) {
        return getCurrentUser().getRole() == role;
    }

    public boolean isAdmin() {
        return hasRole(UserRole.ADMIN);
    }
}
