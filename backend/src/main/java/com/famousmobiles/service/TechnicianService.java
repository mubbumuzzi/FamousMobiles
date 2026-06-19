package com.famousmobiles.service;

import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.famousmobiles.domain.Technician;
import com.famousmobiles.domain.enums.RepairStatus;
import com.famousmobiles.dto.MiscDto;
import com.famousmobiles.exception.ResourceNotFoundException;
import com.famousmobiles.repository.RepairTicketRepository;
import com.famousmobiles.repository.TechnicianRepository;

@Service
public class TechnicianService {

    private final TechnicianRepository technicianRepository;
    private final RepairTicketRepository ticketRepository;

    public TechnicianService(TechnicianRepository technicianRepository, RepairTicketRepository ticketRepository) {
        this.technicianRepository = technicianRepository;
        this.ticketRepository = ticketRepository;
    }

    @Transactional
    public MiscDto.TechnicianResponse create(MiscDto.TechnicianRequest request) {
        Technician technician = new Technician();
        apply(technician, request);
        return MiscDto.TechnicianResponse.from(technicianRepository.save(technician));
    }

    @Transactional
    public MiscDto.TechnicianResponse update(UUID id, MiscDto.TechnicianRequest request) {
        Technician technician = getEntity(id);
        apply(technician, request);
        return MiscDto.TechnicianResponse.from(technicianRepository.save(technician));
    }

    @Transactional(readOnly = true)
    public List<MiscDto.TechnicianResponse> list() {
        return technicianRepository.findActiveStaffTechnicians().stream()
                .map(MiscDto.TechnicianResponse::from).toList();
    }

    @Transactional(readOnly = true)
    public MiscDto.TechnicianResponse getPerformance(UUID id) {
        Technician technician = getEntity(id);
        var tickets = ticketRepository.findByAssignedTechnicianIdOrderByCreatedAtDesc(id);
        long assigned = tickets.size();
        long completed = tickets.stream().filter(t -> t.getStatus() == RepairStatus.DELIVERED).count();
        Double avgHours = tickets.stream()
                .filter(t -> t.getDeliveredAt() != null)
                .mapToDouble(t -> Duration.between(t.getCreatedAt(), t.getDeliveredAt()).toHours())
                .average().orElse(0);
        return new MiscDto.TechnicianResponse(
                technician.getId(), technician.getName(), technician.getMobile(),
                technician.getSkillLevel(), technician.isActive(),
                technician.getUser() != null ? technician.getUser().getId() : null,
                assigned, completed, avgHours
        );
    }

    public Technician getEntity(UUID id) {
        return technicianRepository.findById(id).orElseThrow(() -> new ResourceNotFoundException("Technician not found"));
    }

    private void apply(Technician technician, MiscDto.TechnicianRequest request) {
        technician.setName(request.name());
        technician.setMobile(request.mobile());
        if (request.skillLevel() != null) {
            technician.setSkillLevel(request.skillLevel());
        }
    }
}
