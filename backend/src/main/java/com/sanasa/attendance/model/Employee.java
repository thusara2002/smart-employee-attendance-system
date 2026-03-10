package com.sanasa.attendance.model;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "employees")
public class Employee {
    @Id
    private String id;

    @Indexed(unique = true)
    private String employeeId;

    private String userId;

    @Indexed(unique = true)
    private String email;

    private String firstName;
    private String lastName;
    private String phone;
    private String department;
    private String designation;
    private String profileImage;

    // Face recognition data - primary descriptor (average of all captures)
    private List<Double> faceDescriptor;
    
    // Multiple face descriptors for improved accuracy (captured from different angles)
    private List<List<Double>> faceDescriptors;
    
    // Number of face captures used for registration
    private Integer faceCaptureCount;
    
    // Face registration timestamp
    private LocalDateTime faceRegisteredAt;
    
    private boolean faceRegistered = false;

    // QR Code
    private String qrCode;

    // Shift assignment
    private String shiftId;

    // Status
    private boolean active = true;
    private LocalDate joiningDate;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
