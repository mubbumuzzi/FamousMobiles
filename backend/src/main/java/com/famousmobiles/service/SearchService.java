package com.famousmobiles.service;

import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.famousmobiles.dto.CustomerDto;
import com.famousmobiles.dto.MiscDto;
import com.famousmobiles.dto.TicketDto;
import com.famousmobiles.repository.CustomerRepository;
import com.famousmobiles.repository.RepairTicketRepository;

@Service
public class SearchService {

    private final RepairTicketRepository ticketRepository;
    private final CustomerRepository customerRepository;

    public SearchService(RepairTicketRepository ticketRepository, CustomerRepository customerRepository) {
        this.ticketRepository = ticketRepository;
        this.customerRepository = customerRepository;
    }

    @Transactional(readOnly = true)
    public MiscDto.SearchResult search(String query) {
        return search(query, null);
    }

    @Transactional(readOnly = true)
    public MiscDto.SearchResult search(String query, UUID storeId) {
        if (query == null || query.isBlank()) {
            return new MiscDto.SearchResult(java.util.List.of(), java.util.List.of());
        }
        String q = query.trim();
        var tickets = (storeId != null
                ? ticketRepository.searchWithDetailsAndStore(q, storeId)
                : ticketRepository.searchWithDetails(q))
                .stream().map(TicketDto.TicketResponse::from).toList();
        var customers = customerRepository.search(q).stream().map(CustomerDto.CustomerResponse::from).toList();
        return new MiscDto.SearchResult(tickets, customers);
    }
}
