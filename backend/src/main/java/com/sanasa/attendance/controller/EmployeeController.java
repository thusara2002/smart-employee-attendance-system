package com.sanasa.attendance.controller;

import com.sanasa.attendance.dto.EmployeeDTO;
import com.sanasa.attendance.model.User;
import com.sanasa.attendance.service.EmployeeService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/employees")
public class EmployeeController {

    private final EmployeeService employeeService;

    public EmployeeController(EmployeeService employeeService) {
        this.employeeService = employeeService;
    }

    @GetMapping("/my-qr")
    public ResponseEntity<?> getMyQRCode() {
        try {
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            User user = (User) authentication.getPrincipal();
            EmployeeDTO.EmployeeResponse response = employeeService.getEmployeeByUserId(user.getId());
            Map<String, String> qrData = new HashMap<>();
            qrData.put("qrCode", response.getQrCode());
            qrData.put("employeeId", response.getEmployeeId());
            qrData.put("firstName", response.getFirstName());
            qrData.put("lastName", response.getLastName());
            return ResponseEntity.ok(qrData);
        } catch (Exception e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN', 'STAFF_ADMIN')")
    public ResponseEntity<?> createEmployee(@Valid @RequestBody EmployeeDTO.CreateRequest request) {
        try {
            EmployeeDTO.EmployeeResponse response = employeeService.createEmployee(request);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN', 'STAFF_ADMIN')")
    public ResponseEntity<List<EmployeeDTO.EmployeeResponse>> getAllEmployees() {
        return ResponseEntity.ok(employeeService.getAllEmployees());
    }

    @GetMapping("/active")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN', 'STAFF_ADMIN')")
    public ResponseEntity<List<EmployeeDTO.EmployeeResponse>> getActiveEmployees() {
        return ResponseEntity.ok(employeeService.getActiveEmployees());
    }

    @GetMapping("/count/active")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN', 'STAFF_ADMIN')")
    public ResponseEntity<Long> getActiveEmployeeCount() {
        return ResponseEntity.ok(employeeService.getActiveEmployeeCount());
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN', 'STAFF_ADMIN')")
    public ResponseEntity<?> getEmployeeById(@PathVariable String id) {
        try {
            EmployeeDTO.EmployeeResponse response = employeeService.getEmployeeById(id);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.notFound().build();
        }
    }

    @GetMapping("/by-employee-id/{employeeId}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN', 'STAFF_ADMIN')")
    public ResponseEntity<?> getEmployeeByEmployeeId(@PathVariable String employeeId) {
        try {
            EmployeeDTO.EmployeeResponse response = employeeService.getEmployeeByEmployeeId(employeeId);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.notFound().build();
        }
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN', 'STAFF_ADMIN')")
    public ResponseEntity<?> updateEmployee(@PathVariable String id, @RequestBody EmployeeDTO.UpdateRequest request) {
        try {
            EmployeeDTO.EmployeeResponse response = employeeService.updateEmployee(id, request);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN', 'STAFF_ADMIN')")
    public ResponseEntity<?> deleteEmployee(@PathVariable String id) {
        try {
            employeeService.deleteEmployee(id);
            Map<String, String> response = new HashMap<>();
            response.put("message", "Employee deleted successfully");
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }

    @PostMapping("/register-face")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN', 'STAFF_ADMIN')")
    public ResponseEntity<?> registerFace(@Valid @RequestBody EmployeeDTO.FaceRegistrationRequest request) {
        try {
            EmployeeDTO.EmployeeResponse response = employeeService.registerFace(request);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }

    @PostMapping("/{id}/profile-image")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN', 'STAFF_ADMIN')")
    public ResponseEntity<?> uploadProfileImage(@PathVariable String id, @RequestBody Map<String, String> request) {
        try {
            String profileImage = request.get("profileImage");
            if (profileImage == null || profileImage.isEmpty()) {
                Map<String, String> error = new HashMap<>();
                error.put("error", "Profile image is required");
                return ResponseEntity.badRequest().body(error);
            }
            EmployeeDTO.EmployeeResponse response = employeeService.uploadProfileImage(id, profileImage);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }
}
