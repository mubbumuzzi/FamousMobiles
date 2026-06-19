package com.famousmobiles.config;

import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import com.famousmobiles.domain.InventoryItem;
import com.famousmobiles.repository.InventoryItemRepository;
import com.famousmobiles.service.AuthService;

import java.math.BigDecimal;

@Component
public class DataInitializer implements CommandLineRunner {

    private final AuthService authService;
    private final AppProperties appProperties;
    private final InventoryItemRepository inventoryItemRepository;

    public DataInitializer(AuthService authService, AppProperties appProperties,
            InventoryItemRepository inventoryItemRepository) {
        this.authService = authService;
        this.appProperties = appProperties;
        this.inventoryItemRepository = inventoryItemRepository;
    }

    @Override
    public void run(String... args) {
        authService.seedAdmin(appProperties);
        seedInventory();
    }

    private void seedInventory() {
        if (inventoryItemRepository.count() > 0) return;
        savePart("Display", "DISP-001", 10, 2500, 3500);
        savePart("Battery", "BAT-001", 15, 800, 1200);
        savePart("Charging Port", "CP-001", 20, 300, 500);
        savePart("Speaker", "SPK-001", 8, 200, 400);
        savePart("Camera", "CAM-001", 5, 1500, 2200);
    }

    private void savePart(String name, String sku, int qty, double cost, double sell) {
        InventoryItem item = new InventoryItem();
        item.setPartName(name);
        item.setSku(sku);
        item.setQuantity(qty);
        item.setCostPrice(BigDecimal.valueOf(cost));
        item.setSellingPrice(BigDecimal.valueOf(sell));
        inventoryItemRepository.save(item);
    }
}
