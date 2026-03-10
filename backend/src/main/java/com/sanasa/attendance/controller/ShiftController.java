package com.sanasa.attendance.controller;

import com.sanasa.attendance.model.Shift;
import com.sanasa.attendance.service.ShiftService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/shifts")
public class ShiftController {

    private final ShiftService shiftService;

    public ShiftController(ShiftService shiftService) {
        this.shiftService = shiftService;
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN')")
    public ResponseEntity<?> createShift(
            @RequestParam String name,
            @RequestParam(required = false) String description,
            @RequestParam String startTime,
            @RequestParam String endTime,
            @RequestParam(required = false, defaultValue = "00:15") String graceTime,
            @RequestParam(required = false, defaultValue = "31") int workingDays,
            @RequestParam(required = false, defaultValue = "1.0") double breakHours) {
        try {
            Shift shift = shiftService.createShift(
                    name, description,
                    LocalTime.parse(startTime),
                    LocalTime.parse(endTime),
                    LocalTime.parse(graceTime),
                    workingDays, breakHours);
            return ResponseEntity.ok(shift);
        } catch (Exception e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }

    @GetMapping
    public ResponseEntity<List<Shift>> getAllShifts() {
        return ResponseEntity.ok(shiftService.getAllShifts());
    }

    @GetMapping("/active")
    public ResponseEntity<List<Shift>> getActiveShifts() {
        return ResponseEntity.ok(shiftService.getActiveShifts());
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getShiftById(@PathVariable String id) {
        try {
            Shift shift = shiftService.getShiftById(id);
            return ResponseEntity.ok(shift);
        } catch (Exception e) {
            return ResponseEntity.notFound().build();
        }
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN')")
    public ResponseEntity<?> updateShift(
            @PathVariable String id,
            @RequestParam(required = false) String name,
            @RequestParam(required = false) String description,
            @RequestParam(required = false) String startTime,
            @RequestParam(required = false) String endTime,
            @RequestParam(required = false) String graceTime,
            @RequestParam(required = false, defaultValue = "0") int workingDays,
            @RequestParam(required = false, defaultValue = "-1") double breakHours) {
        try {
            Shift shift = shiftService.updateShift(
                    id, name, description,
                    startTime != null ? LocalTime.parse(startTime) : null,
                    endTime != null ? LocalTime.parse(endTime) : null,
                    graceTime != null ? LocalTime.parse(graceTime) : null,
                    workingDays, breakHours >= 0 ? breakHours : 0);
            return ResponseEntity.ok(shift);
        } catch (Exception e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<?> deleteShift(@PathVariable String id) {
        try {
            shiftService.deleteShift(id);
            Map<String, String> response = new HashMap<>();
            response.put("message", "Shift deleted successfully");
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }
}
