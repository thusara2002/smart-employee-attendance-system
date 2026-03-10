package com.sanasa.attendance.dto;

import com.sanasa.attendance.model.Attendance;
import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

public class AttendanceDTO {

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class QRAttendanceRequest {
        @NotBlank(message = "QR code is required")
        private String qrCode;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class FaceAttendanceRequest {
        private List<Double> faceDescriptor;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ManualAttendanceRequest {
        @NotBlank(message = "Employee ID is required")
        private String employeeId;

        private LocalDateTime checkIn;
        private LocalDateTime checkOut;
        private String notes;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class AttendanceResponse {
        private String id;
        private String employeeId;
        private String employeeName;
        private String department;
        private LocalDate date;
        private LocalDateTime checkIn;
        private LocalDateTime checkOut;
        private Attendance.AttendanceType checkInType;
        private Attendance.AttendanceType checkOutType;
        private Attendance.Status status;
        private double workingHours;
        private String notes;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class AttendanceSummary {
        private LocalDate date;
        private long totalEmployees;
        private long present;
        private long absent;
        private long late;
        private long onLeave;
        private double attendancePercentage;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class MarkAttendanceResponse {
        private String message;
        private String employeeId;
        private String employeeName;
        private String profileImage;
        private String type; // CHECK_IN or CHECK_OUT
        private LocalDateTime timestamp;
    }
}
