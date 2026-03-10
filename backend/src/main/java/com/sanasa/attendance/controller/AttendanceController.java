package com.sanasa.attendance.controller;

import com.sanasa.attendance.dto.AttendanceDTO;
import com.sanasa.attendance.service.AttendanceService;
import jakarta.validation.Valid;
import com.sanasa.attendance.model.User;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/attendance")
public class AttendanceController {

    private final AttendanceService attendanceService;

    public AttendanceController(AttendanceService attendanceService) {
        this.attendanceService = attendanceService;
    }

    // Kiosk endpoints - public access for attendance marking
    @PostMapping("/kiosk/qr")
    public ResponseEntity<?> markAttendanceByQR(@Valid @RequestBody AttendanceDTO.QRAttendanceRequest request) {
        try {
            AttendanceDTO.MarkAttendanceResponse response = attendanceService.markAttendanceByQR(request.getQrCode());
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }

    @PostMapping("/kiosk/face")
    public ResponseEntity<?> markAttendanceByFace(@Valid @RequestBody AttendanceDTO.FaceAttendanceRequest request) {
        try {
            AttendanceDTO.MarkAttendanceResponse response = attendanceService
                    .markAttendanceByFace(request.getFaceDescriptor());
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }

    // Manual attendance - Admin only
    @PostMapping("/manual")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN')")
    public ResponseEntity<?> markManualAttendance(@Valid @RequestBody AttendanceDTO.ManualAttendanceRequest request) {
        try {
            AttendanceDTO.MarkAttendanceResponse response = attendanceService.markManualAttendance(request);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }

    // Get attendance records
    @GetMapping("/today")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN')")
    public ResponseEntity<List<AttendanceDTO.AttendanceResponse>> getTodayAttendance() {
        return ResponseEntity.ok(attendanceService.getTodayAttendance());
    }

    @GetMapping("/my-today")
    public ResponseEntity<AttendanceDTO.AttendanceResponse> getMyTodayAttendance() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        User user = (User) authentication.getPrincipal();
        return ResponseEntity.ok(attendanceService.getEmployeeTodayAttendanceByUserId(user.getId()));
    }

    @GetMapping("/date/{date}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN')")
    public ResponseEntity<List<AttendanceDTO.AttendanceResponse>> getAttendanceByDate(
            @PathVariable @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        return ResponseEntity.ok(attendanceService.getAttendanceByDate(date));
    }

    @GetMapping("/range")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN')")
    public ResponseEntity<List<AttendanceDTO.AttendanceResponse>> getAttendanceByRange(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        return ResponseEntity.ok(attendanceService.getAttendanceByDateRange(startDate, endDate));
    }

    @GetMapping("/employee/{employeeId}")
    public ResponseEntity<List<AttendanceDTO.AttendanceResponse>> getEmployeeAttendance(
            @PathVariable String employeeId) {
        return ResponseEntity.ok(attendanceService.getEmployeeAttendance(employeeId));
    }

    @GetMapping("/employee/{employeeId}/recent")
    public ResponseEntity<List<AttendanceDTO.AttendanceResponse>> getEmployeeRecentAttendance(
            @PathVariable String employeeId,
            @RequestParam(defaultValue = "7") int limit) {
        return ResponseEntity.ok(attendanceService.getEmployeeRecentAttendance(employeeId, limit));
    }

    @GetMapping("/employee/{employeeId}/range")
    public ResponseEntity<List<AttendanceDTO.AttendanceResponse>> getEmployeeAttendanceByRange(
            @PathVariable String employeeId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        return ResponseEntity.ok(attendanceService.getEmployeeAttendanceByDateRange(employeeId, startDate, endDate));
    }

    @GetMapping("/summary")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN')")
    public ResponseEntity<AttendanceDTO.AttendanceSummary> getAttendanceSummary(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        LocalDate targetDate = date != null ? date : LocalDate.now();
        return ResponseEntity.ok(attendanceService.getAttendanceSummary(targetDate));
    }
}
