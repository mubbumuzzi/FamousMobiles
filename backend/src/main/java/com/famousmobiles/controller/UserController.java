package com.famousmobiles.controller;

import java.util.List;
import java.util.UUID;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.famousmobiles.dto.CreateUserRequest;
import com.famousmobiles.dto.UpdateUserRequest;
import com.famousmobiles.dto.UserResponse;
import com.famousmobiles.service.AuthService;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/users")
@PreAuthorize("hasRole('ADMIN')")
public class UserController {

    private final AuthService authService;

    public UserController(AuthService authService) {
        this.authService = authService;
    }

    @GetMapping
    public List<UserResponse> list() {
        return authService.listUsers();
    }

    @PostMapping
    public UserResponse create(@Valid @RequestBody CreateUserRequest request) {
        return authService.createUser(request);
    }

    @PutMapping("/{id}")
    public UserResponse update(@PathVariable UUID id, @Valid @RequestBody UpdateUserRequest request) {
        return authService.updateUser(id, request);
    }

    @DeleteMapping("/{id}")
    public void delete(@PathVariable UUID id,
            @org.springframework.web.bind.annotation.RequestParam(defaultValue = "false") boolean permanent) {
        if (permanent) {
            authService.permanentlyDeleteUser(id);
        } else {
            authService.deleteUser(id);
        }
    }
}
