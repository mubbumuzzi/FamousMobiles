package com.famousmobiles.service;

import java.util.List;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.famousmobiles.domain.InventoryItem;
import com.famousmobiles.domain.InventoryTransaction;
import com.famousmobiles.domain.enums.InventoryTransactionType;
import com.famousmobiles.dto.MiscDto;
import com.famousmobiles.exception.BadRequestException;
import com.famousmobiles.exception.ResourceNotFoundException;
import com.famousmobiles.repository.InventoryItemRepository;
import com.famousmobiles.repository.InventoryTransactionRepository;
import com.famousmobiles.security.SecurityUtils;

@Service
public class InventoryService {

    private final InventoryItemRepository itemRepository;
    private final InventoryTransactionRepository transactionRepository;
    private final SecurityUtils securityUtils;

    public InventoryService(InventoryItemRepository itemRepository,
            InventoryTransactionRepository transactionRepository, SecurityUtils securityUtils) {
        this.itemRepository = itemRepository;
        this.transactionRepository = transactionRepository;
        this.securityUtils = securityUtils;
    }

    @Transactional
    public MiscDto.InventoryItemResponse create(MiscDto.InventoryItemRequest request) {
        InventoryItem item = new InventoryItem();
        apply(item, request);
        return MiscDto.InventoryItemResponse.from(itemRepository.save(item));
    }

    @Transactional
    public MiscDto.InventoryItemResponse update(UUID id, MiscDto.InventoryItemRequest request) {
        InventoryItem item = getEntity(id);
        apply(item, request);
        return MiscDto.InventoryItemResponse.from(itemRepository.save(item));
    }

    public List<MiscDto.InventoryItemResponse> list() {
        return itemRepository.findAll().stream().map(MiscDto.InventoryItemResponse::from).toList();
    }

    public List<MiscDto.InventoryItemResponse> lowStock() {
        return itemRepository.findLowStockItems().stream().map(MiscDto.InventoryItemResponse::from).toList();
    }

    @Transactional
    public MiscDto.InventoryItemResponse adjust(UUID id, MiscDto.InventoryAdjustRequest request, InventoryTransactionType type) {
        InventoryItem item = getEntity(id);
        int delta = request.quantity();
        if (type == InventoryTransactionType.DEDUCT) {
            if (item.getQuantity() < delta) {
                throw new BadRequestException("Insufficient stock");
            }
            item.setQuantity(item.getQuantity() - delta);
        } else {
            item.setQuantity(item.getQuantity() + delta);
        }
        itemRepository.save(item);

        InventoryTransaction tx = new InventoryTransaction();
        tx.setInventoryItem(item);
        tx.setTransactionType(type);
        tx.setQuantity(delta);
        tx.setNotes(request.notes());
        tx.setPerformedBy(securityUtils.getCurrentUser());
        transactionRepository.save(tx);
        return MiscDto.InventoryItemResponse.from(item);
    }

    public InventoryItem getEntity(UUID id) {
        return itemRepository.findById(id).orElseThrow(() -> new ResourceNotFoundException("Inventory item not found"));
    }

    private void apply(InventoryItem item, MiscDto.InventoryItemRequest request) {
        item.setPartName(request.partName());
        item.setSku(request.sku());
        item.setQuantity(request.quantity());
        item.setCostPrice(request.costPrice());
        item.setSellingPrice(request.sellingPrice());
        item.setLowStockThreshold(request.lowStockThreshold());
    }
}
