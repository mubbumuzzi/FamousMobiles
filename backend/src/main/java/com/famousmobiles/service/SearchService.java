package com.famousmobiles.service;

import org.springframework.stereotype.Service;

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

    public MiscDto.SearchResult search(String query) {
        if (query == null || query.isBlank()) {
            return new MiscDto.SearchResult(java.util.List.of(), java.util.List.of());
        }
        String q = query.trim();
        var tickets = ticketRepository.search(q).stream().map(TicketDto.TicketResponse::from).toList();
        var customers = customerRepository.search(q).stream().map(CustomerDto.CustomerResponse::from).toList();
        return new MiscDto.SearchResult(tickets, customers);
    }
}
