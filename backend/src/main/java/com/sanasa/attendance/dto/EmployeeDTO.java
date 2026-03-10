package com.sanasa.attendance.dto;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

public class EmployeeDTO {

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CreateRequest {
        private String employeeId;

        @NotBlank(message = "Email is required")
        @Email(message = "Invalid email format")
        private String email;

        @NotBlank(message = "Password is required")
        private String password;

        @NotBlank(message = "First name is required")
        private String firstName;

        @NotBlank(message = "Last name is required")
        private String lastName;

        private String phone;
        private String department;
        private String designation;
        private String shiftId;
        private LocalDate joiningDate;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class UpdateRequest {
        private String firstName;
        private String lastName;
        private String phone;
        private String department;
        private String designation;
        private String shiftId;
        private boolean active;
        private String role;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class EmployeeResponse {
        private String id;
        private String employeeId;
        private String userId;
        private String email;
        private String firstName;
        private String lastName;
        private String phone;
        private String department;
        private String designation;
        private String profileImage;
        private boolean faceRegistered;
        private String qrCode;
        private String shiftId;
        private String shiftName;
        private boolean active;
        private String role;
        private LocalDate joiningDate;
        private LocalDateTime createdAt;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class FaceRegistrationRequest {
        @NotBlank(message = "Employee ID is required")
        private String employeeId;

        // Primary descriptor (average of all captures for quick matching)
        private List<Double> primaryDescriptor;

        // All individual descriptors for comprehensive matching
        private List<List<Double>> allDescriptors;

        // Number of face captures
        private Integer captureCount;

        // Legacy support for single descriptor
        private List<Double> faceDescriptor;
    }
}
