package com.famousmobiles.controller;

import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Public online tracking has been retired to protect customer data and eliminate IDOR receipt enumeration risks.
 * Customers are directed to contact Famous Mobiles support directly.
 */
@RestController
@RequestMapping("/api/public/track")
public class PublicTrackingController {

    private static final String DISABLED_MESSAGE =
            "Public online tracking has been retired. For repair status or assistance, please contact Famous Mobiles directly at +91 9063786751.";

    @GetMapping(value = {"", "/**"})
    public ResponseEntity<Map<String, Object>> disabled() {
        return ResponseEntity.status(HttpStatus.GONE).body(Map.of(
                "status", HttpStatus.GONE.value(),
                "error", "Gone",
                "message", DISABLED_MESSAGE
        ));
    }
}
