package com.sanasa.attendance.model;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "notifications")
public class Notification {
    @Id
    private String id;

    @org.springframework.data.mongodb.core.index.Indexed
    private String userId;
    private String title;
    private String message;
    private NotificationType type;

    private String referenceId; // Reference to attendance, leave, etc.
    private String referenceType;

    private boolean read = false;
    private LocalDateTime createdAt;
    private LocalDateTime readAt;

    public enum NotificationType {
        ATTENDANCE,
        LEAVE_REQUEST,
        LEAVE_APPROVED,
        LEAVE_REJECTED,
        LATE_ARRIVAL,
        ABSENT,
        SYSTEM,
        SHIFT_CHANGE
    }
}
