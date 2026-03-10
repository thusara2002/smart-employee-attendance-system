package com.sanasa.attendance.model;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.index.CompoundIndexes;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@CompoundIndexes({
        @CompoundIndex(name = "emp_date_idx", def = "{'employeeId': 1, 'date': 1}")
})
@Document(collection = "attendance")
public class Attendance {
    @Id
    private String id;

    private String employeeId;
    private String employeeName;
    private String department;

    private LocalDate date;
    private LocalDateTime checkIn;
    private LocalDateTime checkOut;

    private AttendanceType checkInType;
    private AttendanceType checkOutType;

    private Status status;

    private double workingHours;
    private String notes;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public enum AttendanceType {
        QR_CODE,
        FACE_RECOGNITION,
        MANUAL
    }

    public enum Status {
        PRESENT,
        ABSENT,
        HALF_DAY,
        LATE,
        ON_LEAVE
    }
}
