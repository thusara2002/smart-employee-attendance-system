package com.sanasa.attendance.service;

import com.sanasa.attendance.model.Shift;
import com.sanasa.attendance.repository.ShiftRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;

@Service
public class ShiftService {

    private final ShiftRepository shiftRepository;

    public ShiftService(ShiftRepository shiftRepository) {
        this.shiftRepository = shiftRepository;
    }

    public Shift createShift(String name, String description, LocalTime startTime, LocalTime endTime,
            LocalTime graceTime, int workingDays, double breakHours) {
        Shift shift = new Shift();
        shift.setName(name);
        shift.setDescription(description);
        shift.setStartTime(startTime);
        shift.setEndTime(endTime);
        shift.setGraceTime(graceTime);
        shift.setWorkingDays(workingDays);
        shift.setBreakHours(breakHours);
        shift.setActive(true);
        shift.setCreatedAt(LocalDateTime.now());
        shift.setUpdatedAt(LocalDateTime.now());

        return shiftRepository.save(shift);
    }

    public List<Shift> getAllShifts() {
        return shiftRepository.findAll();
    }

    public List<Shift> getActiveShifts() {
        return shiftRepository.findByActiveTrue();
    }

    public Shift getShiftById(String id) {
        return shiftRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Shift not found"));
    }

    public Shift updateShift(String id, String name, String description, LocalTime startTime,
            LocalTime endTime, LocalTime graceTime, int workingDays, double breakHours) {
        Shift shift = shiftRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Shift not found"));

        if (name != null)
            shift.setName(name);
        if (description != null)
            shift.setDescription(description);
        if (startTime != null)
            shift.setStartTime(startTime);
        if (endTime != null)
            shift.setEndTime(endTime);
        if (graceTime != null)
            shift.setGraceTime(graceTime);
        if (workingDays > 0)
            shift.setWorkingDays(workingDays);
        if (breakHours >= 0)
            shift.setBreakHours(breakHours);
        shift.setUpdatedAt(LocalDateTime.now());

        return shiftRepository.save(shift);
    }

    public void deleteShift(String id) {
        Shift shift = shiftRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Shift not found"));

        shift.setActive(false);
        shift.setUpdatedAt(LocalDateTime.now());
        shiftRepository.save(shift);
    }
}
