package com.sanasa.attendance.service;

import com.sanasa.attendance.model.Leave;
import com.sanasa.attendance.model.Employee;
import com.sanasa.attendance.model.User;
import com.sanasa.attendance.repository.LeaveRepository;
import com.sanasa.attendance.repository.EmployeeRepository;
import org.springframework.stereotype.Service;

import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.List;

@Service
public class LeaveService {

    private final LeaveRepository leaveRepository;
    private final EmployeeRepository employeeRepository;
    private final NotificationService notificationService;

    public LeaveService(LeaveRepository leaveRepository, EmployeeRepository employeeRepository,
            NotificationService notificationService) {
        this.leaveRepository = leaveRepository;
        this.employeeRepository = employeeRepository;
        this.notificationService = notificationService;
    }

    public Leave requestLeave(String employeeId, Leave.LeaveType leaveType,
            LocalDate startDate, LocalDate endDate, String reason) {
        Employee employee = employeeRepository.findByEmployeeId(employeeId)
                .orElseThrow(() -> new RuntimeException("Employee not found"));

        Leave leave = new Leave();
        leave.setEmployeeId(employeeId);
        leave.setEmployeeName(employee.getFirstName() + " " + employee.getLastName());
        leave.setDepartment(employee.getDepartment());
        leave.setLeaveType(leaveType);
        leave.setStartDate(startDate);
        leave.setEndDate(endDate);
        leave.setDays((int) ChronoUnit.DAYS.between(startDate, endDate) + 1);
        leave.setReason(reason);
        leave.setStatus(Leave.Status.PENDING);
        leave.setCreatedAt(LocalDateTime.now());
        leave.setUpdatedAt(LocalDateTime.now());

        leave = leaveRepository.save(leave);

        notificationService.notifyLeaveRequest(leave);

        return leave;
    }

    public Leave approveLeave(String leaveId, String approvedBy, String comments) {
        Leave leave = leaveRepository.findById(leaveId)
                .orElseThrow(() -> new RuntimeException("Leave request not found"));

        leave.setStatus(Leave.Status.APPROVED);
        leave.setApprovedBy(approvedBy);
        leave.setApproverComments(comments);
        leave.setApprovedAt(LocalDateTime.now());
        leave.setUpdatedAt(LocalDateTime.now());

        final Leave finalSavedLeave = leaveRepository.save(leave);
        final String empId = finalSavedLeave.getEmployeeId();

        // Find employee's user ID for notification
        employeeRepository.findByEmployeeId(empId)
                .ifPresent(employee -> notificationService.notifyLeaveApproved(finalSavedLeave, employee.getUserId()));

        return finalSavedLeave;
    }

    public Leave rejectLeave(String leaveId, String rejectedBy, String reason) {
        Leave leave = leaveRepository.findById(leaveId)
                .orElseThrow(() -> new RuntimeException("Leave request not found"));

        leave.setStatus(Leave.Status.REJECTED);
        leave.setApprovedBy(rejectedBy);
        leave.setApproverComments(reason);
        leave.setApprovedAt(LocalDateTime.now());
        leave.setUpdatedAt(LocalDateTime.now());

        final Leave finalSavedLeave = leaveRepository.save(leave);
        final String empId = finalSavedLeave.getEmployeeId();
        final String finalReason = reason;

        // Find employee's user ID for notification
        employeeRepository.findByEmployeeId(empId)
                .ifPresent(
                        employee -> notificationService.notifyLeaveRejected(finalSavedLeave, employee.getUserId(),
                                finalReason));

        return finalSavedLeave;
    }

    public Leave cancelLeave(String leaveId) {
        Leave leave = leaveRepository.findById(leaveId)
                .orElseThrow(() -> new RuntimeException("Leave request not found"));

        if (leave.getStatus() != Leave.Status.PENDING) {
            throw new RuntimeException("Only pending leaves can be cancelled");
        }

        leave.setStatus(Leave.Status.CANCELLED);
        leave.setUpdatedAt(LocalDateTime.now());

        return leaveRepository.save(leave);
    }

    public List<Leave> getAllLeaves() {
        return leaveRepository.findAll();
    }

    public List<Leave> getPendingLeaves() {
        return leaveRepository.findPendingLeaves();
    }

    public List<Leave> getEmployeeLeaves(String employeeId) {
        return leaveRepository.findByEmployeeId(employeeId);
    }

    public List<Leave> getEmployeeRecentLeaves(String employeeId, int limit) {
        Pageable pageable = PageRequest.of(0, limit, Sort.by(Sort.Direction.DESC, "startDate"));
        return leaveRepository.findByEmployeeId(employeeId, pageable);
    }

    public List<Leave> getLeavesByStatus(Leave.Status status) {
        return leaveRepository.findByStatus(status);
    }

    public List<Leave> getDepartmentLeaves(String department) {
        return leaveRepository.findByDepartment(department);
    }

    public boolean isOnLeave(String employeeId, LocalDate date) {
        List<Leave> leaves = leaveRepository.findByEmployeeIdAndDateInRange(employeeId, date);
        return leaves.stream().anyMatch(leave -> leave.getStatus() == Leave.Status.APPROVED);
    }
}
