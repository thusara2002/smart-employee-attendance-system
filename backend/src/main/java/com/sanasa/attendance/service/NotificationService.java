package com.sanasa.attendance.service;

import com.sanasa.attendance.model.Employee;
import com.sanasa.attendance.model.Leave;
import com.sanasa.attendance.model.Notification;
import com.sanasa.attendance.model.User;
import com.sanasa.attendance.repository.NotificationRepository;
import com.sanasa.attendance.repository.UserRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;
    private final EmailService emailService;

    public NotificationService(NotificationRepository notificationRepository, UserRepository userRepository,
            EmailService emailService) {
        this.notificationRepository = notificationRepository;
        this.userRepository = userRepository;
        this.emailService = emailService;
    }

    public void notifyLateArrival(Employee employee, LocalDateTime arrivalTime) {
        // Notify all admins and super admins
        List<User> admins = userRepository.findByRole(User.Role.ADMIN);
        List<User> superAdmins = userRepository.findByRole(User.Role.SUPER_ADMIN);

        String message = String.format("%s %s arrived late at %s",
                employee.getFirstName(), employee.getLastName(),
                arrivalTime.toLocalTime().toString());

        for (User admin : admins) {
            createNotification(admin.getId(), "Late Arrival", message,
                    Notification.NotificationType.LATE_ARRIVAL, employee.getId(), "EMPLOYEE");
            sendEmailSafely(admin.getEmail(), "Late Arrival", message);
        }

        for (User superAdmin : superAdmins) {
            createNotification(superAdmin.getId(), "Late Arrival", message,
                    Notification.NotificationType.LATE_ARRIVAL, employee.getId(), "EMPLOYEE");
            sendEmailSafely(superAdmin.getEmail(), "Late Arrival", message);
        }
    }

    public void notifyAbsence(Employee employee) {
        List<User> admins = userRepository.findByRole(User.Role.ADMIN);
        List<User> superAdmins = userRepository.findByRole(User.Role.SUPER_ADMIN);

        String message = String.format("%s %s is absent today",
                employee.getFirstName(), employee.getLastName());

        for (User admin : admins) {
            createNotification(admin.getId(), "Employee Absent", message,
                    Notification.NotificationType.ABSENT, employee.getId(), "EMPLOYEE");
            sendEmailSafely(admin.getEmail(), "Employee Absent", message);
        }

        for (User superAdmin : superAdmins) {
            createNotification(superAdmin.getId(), "Employee Absent", message,
                    Notification.NotificationType.ABSENT, employee.getId(), "EMPLOYEE");
            sendEmailSafely(superAdmin.getEmail(), "Employee Absent", message);
        }
    }

    public void notifyLeaveRequest(Leave leave) {
        List<User> admins = userRepository.findByRole(User.Role.ADMIN);
        List<User> superAdmins = userRepository.findByRole(User.Role.SUPER_ADMIN);

        String message = String.format("%s has requested %s leave from %s to %s",
                leave.getEmployeeName(), leave.getLeaveType().name().toLowerCase(),
                leave.getStartDate().toString(), leave.getEndDate().toString());

        for (User admin : admins) {
            createNotification(admin.getId(), "Leave Request", message,
                    Notification.NotificationType.LEAVE_REQUEST, leave.getId(), "LEAVE");
            sendEmailSafely(admin.getEmail(), "Leave Request", message);
        }

        for (User superAdmin : superAdmins) {
            createNotification(superAdmin.getId(), "Leave Request", message,
                    Notification.NotificationType.LEAVE_REQUEST, leave.getId(), "LEAVE");
            sendEmailSafely(superAdmin.getEmail(), "Leave Request", message);
        }
    }

    public void notifyLeaveApproved(Leave leave, String employeeUserId) {
        String message = String.format("Your %s leave from %s to %s has been approved",
                leave.getLeaveType().name().toLowerCase(),
                leave.getStartDate().toString(), leave.getEndDate().toString());

        createNotification(employeeUserId, "Leave Approved", message,
                Notification.NotificationType.LEAVE_APPROVED, leave.getId(), "LEAVE");

        // Send email to the employee
        userRepository.findById(employeeUserId)
                .ifPresent(user -> sendEmailSafely(user.getEmail(), "Leave Approved", message));
    }

    public void notifyLeaveRejected(Leave leave, String employeeUserId, String reason) {
        String message = String.format("Your %s leave from %s to %s has been rejected. Reason: %s",
                leave.getLeaveType().name().toLowerCase(),
                leave.getStartDate().toString(), leave.getEndDate().toString(), reason);

        createNotification(employeeUserId, "Leave Rejected", message,
                Notification.NotificationType.LEAVE_REJECTED, leave.getId(), "LEAVE");

        // Send email to the employee
        userRepository.findById(employeeUserId)
                .ifPresent(user -> sendEmailSafely(user.getEmail(), "Leave Rejected", message));
    }

    private void createNotification(String userId, String title, String message,
            Notification.NotificationType type, String referenceId, String referenceType) {
        Notification notification = new Notification();
        notification.setUserId(userId);
        notification.setTitle(title);
        notification.setMessage(message);
        notification.setType(type);
        notification.setReferenceId(referenceId);
        notification.setReferenceType(referenceType);
        notification.setRead(false);
        notification.setCreatedAt(LocalDateTime.now());

        notificationRepository.save(notification);
    }

    private void sendEmailSafely(String toEmail, String subject, String message) {
        try {
            emailService.sendNotificationEmail(toEmail, subject, message);
        } catch (Exception e) {
            // Log error but don't break the notification flow
            System.err.println("Failed to send notification email to " + toEmail + ": " + e.getMessage());
        }
    }

    public List<Notification> getUserNotifications(String userId) {
        return notificationRepository.findByUserIdOrderByCreatedAtDesc(userId);
    }

    public List<Notification> getUnreadNotifications(String userId) {
        return notificationRepository.findByUserIdAndReadFalseOrderByCreatedAtDesc(userId);
    }

    public long getUnreadCount(String userId) {
        return notificationRepository.countByUserIdAndReadFalse(userId);
    }

    public void markAsRead(String notificationId) {
        notificationRepository.findById(notificationId).ifPresent(notification -> {
            notification.setRead(true);
            notification.setReadAt(LocalDateTime.now());
            notificationRepository.save(notification);
        });
    }

    public void markAllAsRead(String userId) {
        List<Notification> notifications = notificationRepository.findByUserIdAndReadFalseOrderByCreatedAtDesc(userId);
        for (Notification notification : notifications) {
            notification.setRead(true);
            notification.setReadAt(LocalDateTime.now());
        }
        notificationRepository.saveAll(notifications);
    }
}
