package com.sanasa.attendance.controller;

import com.sanasa.attendance.model.Leave;
import com.sanasa.attendance.model.User;
import com.sanasa.attendance.model.Employee;
import com.sanasa.attendance.repository.EmployeeRepository;
import com.sanasa.attendance.service.LeaveService;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/leaves")
public class LeaveController {

    private final LeaveService leaveService;
    private final EmployeeRepository employeeRepository;

    public LeaveController(LeaveService leaveService, EmployeeRepository employeeRepository) {
        this.leaveService = leaveService;
        this.employeeRepository = employeeRepository;
    }

    @PostMapping
    public ResponseEntity<?> requestLeave(
            @RequestParam String leaveType,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam String reason) {
        try {
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            User user = (User) authentication.getPrincipal();

            Employee employee = employeeRepository.findByUserId(user.getId())
                    .orElseThrow(() -> new RuntimeException("Employee record not found"));

            Leave leave = leaveService.requestLeave(
                    employee.getEmployeeId(),
                    Leave.LeaveType.valueOf(leaveType.toUpperCase()),
                    startDate, endDate, reason);
            return ResponseEntity.ok(leave);
        } catch (Exception e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN', 'STAFF_ADMIN')")
    public ResponseEntity<List<Leave>> getAllLeaves() {
        return ResponseEntity.ok(leaveService.getAllLeaves());
    }

    @GetMapping("/pending")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN', 'STAFF_ADMIN')")
    public ResponseEntity<List<Leave>> getPendingLeaves() {
        return ResponseEntity.ok(leaveService.getPendingLeaves());
    }

    @GetMapping("/my-leaves")
    public ResponseEntity<List<Leave>> getMyLeaves() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        User user = (User) authentication.getPrincipal();

        Employee employee = employeeRepository.findByUserId(user.getId()).orElse(null);
        if (employee == null) {
            return ResponseEntity.ok(List.of());
        }
        return ResponseEntity.ok(leaveService.getEmployeeLeaves(employee.getEmployeeId()));
    }

    @GetMapping("/my-recent-leaves")
    public ResponseEntity<List<Leave>> getMyRecentLeaves(
            @RequestParam(defaultValue = "5") int limit) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        User user = (User) authentication.getPrincipal();

        Employee employee = employeeRepository.findByUserId(user.getId()).orElse(null);
        if (employee == null) {
            return ResponseEntity.ok(List.of());
        }
        return ResponseEntity.ok(leaveService.getEmployeeRecentLeaves(employee.getEmployeeId(), limit));
    }

    @GetMapping("/employee/{employeeId}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN', 'STAFF_ADMIN')")
    public ResponseEntity<List<Leave>> getEmployeeLeaves(@PathVariable String employeeId) {
        return ResponseEntity.ok(leaveService.getEmployeeLeaves(employeeId));
    }

    @PutMapping("/{id}/approve")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN', 'STAFF_ADMIN')")
    public ResponseEntity<?> approveLeave(
            @PathVariable String id,
            @RequestParam(required = false) String comments) {
        try {
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            User user = (User) authentication.getPrincipal();

            Leave leave = leaveService.approveLeave(id, user.getFirstName() + " " + user.getLastName(), comments);
            return ResponseEntity.ok(leave);
        } catch (Exception e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }

    @PutMapping("/{id}/reject")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN', 'STAFF_ADMIN')")
    public ResponseEntity<?> rejectLeave(
            @PathVariable String id,
            @RequestParam String reason) {
        try {
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            User user = (User) authentication.getPrincipal();

            Leave leave = leaveService.rejectLeave(id, user.getFirstName() + " " + user.getLastName(), reason);
            return ResponseEntity.ok(leave);
        } catch (Exception e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }

    @PutMapping("/{id}/cancel")
    public ResponseEntity<?> cancelLeave(@PathVariable String id) {
        try {
            Leave leave = leaveService.cancelLeave(id);
            return ResponseEntity.ok(leave);
        } catch (Exception e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }
}
