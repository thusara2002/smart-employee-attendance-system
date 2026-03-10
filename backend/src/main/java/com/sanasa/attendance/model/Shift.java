package com.sanasa.attendance.model;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalTime;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "shifts")
public class Shift {
    @Id
    private String id;

    private String name;
    private String description;

    private LocalTime startTime;
    private LocalTime endTime;
    private LocalTime graceTime; // Grace period for late arrivals

    private int workingDays; // Bitmask: Mon=1, Tue=2, Wed=4, Thu=8, Fri=16, Sat=32, Sun=64

    private double breakHours;
    private boolean active = true;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
