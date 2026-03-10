package com.sanasa.attendance.model;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "leaves")
public class Leave {
    @Id
    private String id;

    @org.springframework.data.mongodb.core.index.Indexed
    private String employeeId;
    private String employeeName;
    private String department;

    private LeaveType leaveType;
    private LocalDate startDate;
    private LocalDate endDate;
    private int days;

    private String reason;
    private Status status = Status.PENDING;

    private String approvedBy;
    private String approverComments;
    private LocalDateTime approvedAt;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public enum LeaveType {
        CASUAL,
        SICK,
        ANNUAL,
        UNPAID,
        MATERNITY,
        PATERNITY,
        OTHER
    }

    public enum Status {
        PENDING,
        APPROVED,
        REJECTED,
        CANCELLED
    }
}
