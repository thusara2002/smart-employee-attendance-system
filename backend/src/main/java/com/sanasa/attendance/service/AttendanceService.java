package com.sanasa.attendance.service;

import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import com.sanasa.attendance.dto.AttendanceDTO;
import com.sanasa.attendance.model.Attendance;
import com.sanasa.attendance.model.Employee;
import com.sanasa.attendance.model.Shift;
import com.sanasa.attendance.repository.AttendanceRepository;
import com.sanasa.attendance.repository.EmployeeRepository;
import com.sanasa.attendance.repository.ShiftRepository;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;

@Service
public class AttendanceService {
    private static final Logger logger = LoggerFactory.getLogger(AttendanceService.class);

    private final AttendanceRepository attendanceRepository;
    private final EmployeeRepository employeeRepository;
    private final ShiftRepository shiftRepository;
    private final NotificationService notificationService;

    public AttendanceService(AttendanceRepository attendanceRepository,
            EmployeeRepository employeeRepository,
            ShiftRepository shiftRepository,
            NotificationService notificationService) {
        this.attendanceRepository = attendanceRepository;
        this.employeeRepository = employeeRepository;
        this.shiftRepository = shiftRepository;
        this.notificationService = notificationService;
    }

    public AttendanceDTO.MarkAttendanceResponse markAttendanceByQR(String qrCode) {
        Employee employee = employeeRepository.findByQrCode(qrCode)
                .orElseThrow(() -> new RuntimeException("Invalid QR code"));

        return markAttendance(employee, Attendance.AttendanceType.QR_CODE);
    }

    public AttendanceDTO.MarkAttendanceResponse markAttendanceByFace(List<Double> faceDescriptor) {
        // Find employee by face descriptor matching
        List<Employee> employees = employeeRepository.findByFaceRegisteredTrue();

        Employee matchedEmployee = null;
        double bestMatch = Double.MAX_VALUE;
        double matchThreshold = 0.6; // Tightened threshold for better accuracy
        double earlyExitThreshold = 0.4; // High confidence threshold for faster matching

        for (Employee employee : employees) {
            double minDistance = Double.MAX_VALUE;

            // First check against primary descriptor (average descriptor)
            if (employee.getFaceDescriptor() != null && !employee.getFaceDescriptor().isEmpty()) {
                double distance = calculateEuclideanDistance(faceDescriptor, employee.getFaceDescriptor());
                minDistance = Math.min(minDistance, distance);
            }

            // Then check against all stored descriptors for better accuracy
            if (employee.getFaceDescriptors() != null && !employee.getFaceDescriptors().isEmpty()) {
                for (List<Double> storedDescriptor : employee.getFaceDescriptors()) {
                    if (storedDescriptor != null && !storedDescriptor.isEmpty()) {
                        double distance = calculateEuclideanDistance(faceDescriptor, storedDescriptor);
                        minDistance = Math.min(minDistance, distance);
                    }
                }
            }

            // Update best match if this employee has a better match
            if (minDistance < bestMatch) {
                bestMatch = minDistance;
                if (minDistance < matchThreshold) {
                    matchedEmployee = employee;
                }

                // Early exit if we found a very high confidence match
                if (minDistance < earlyExitThreshold) {
                    logger.info("High confidence face match found for employee: {} (distance: {})",
                            employee.getEmployeeId(), String.format("%.4f", minDistance));
                    break;
                }
            }
        }

        logger.info("Face recognition attempt: Best distance = {}, Matched = {}",
                String.format("%.4f", bestMatch), matchedEmployee != null ? matchedEmployee.getEmployeeId() : "NONE");

        if (matchedEmployee == null) {
            throw new RuntimeException(
                    "Face not recognized. Please ensure your face is registered or try again with better lighting.");
        }

        return markAttendance(matchedEmployee, Attendance.AttendanceType.FACE_RECOGNITION);
    }

    public AttendanceDTO.MarkAttendanceResponse markManualAttendance(AttendanceDTO.ManualAttendanceRequest request) {
        Employee employee = employeeRepository.findByEmployeeId(request.getEmployeeId())
                .orElseThrow(() -> new RuntimeException("Employee not found"));

        Attendance attendance = new Attendance();
        attendance.setEmployeeId(employee.getEmployeeId());
        attendance.setEmployeeName(employee.getFirstName() + " " + employee.getLastName());
        attendance.setDepartment(employee.getDepartment());
        attendance.setDate(request.getCheckIn().toLocalDate());
        attendance.setCheckIn(request.getCheckIn());
        attendance.setCheckInType(Attendance.AttendanceType.MANUAL);

        if (request.getCheckOut() != null) {
            attendance.setCheckOut(request.getCheckOut());
            attendance.setCheckOutType(Attendance.AttendanceType.MANUAL);
            attendance.setWorkingHours(calculateWorkingHours(request.getCheckIn(), request.getCheckOut()));
        }

        attendance.setStatus(determineStatus(employee, request.getCheckIn().toLocalTime()));
        attendance.setNotes(request.getNotes());
        attendance.setCreatedAt(LocalDateTime.now());
        attendance.setUpdatedAt(LocalDateTime.now());

        attendanceRepository.save(attendance);

        return new AttendanceDTO.MarkAttendanceResponse(
                "Attendance marked successfully",
                employee.getEmployeeId(),
                employee.getFirstName() + " " + employee.getLastName(),
                employee.getProfileImage(),
                "CHECK_IN",
                request.getCheckIn());
    }

    private AttendanceDTO.MarkAttendanceResponse markAttendance(Employee employee, Attendance.AttendanceType type) {
        LocalDate today = LocalDate.now();
        LocalDateTime now = LocalDateTime.now();

        // Check if already checked in today
        Optional<Attendance> existingAttendance = attendanceRepository
                .findFirstByEmployeeIdAndDateOrderByCheckInDesc(employee.getEmployeeId(), today);

        if (existingAttendance.isPresent()) {
            Attendance attendance = existingAttendance.get();

            if (attendance.getCheckOut() == null) {
                // Check out
                attendance.setCheckOut(now);
                attendance.setCheckOutType(type);
                attendance.setWorkingHours(calculateWorkingHours(attendance.getCheckIn(), now));
                attendance.setUpdatedAt(now);
                attendanceRepository.save(attendance);

                return new AttendanceDTO.MarkAttendanceResponse(
                        "Checked out successfully",
                        employee.getEmployeeId(),
                        employee.getFirstName() + " " + employee.getLastName(),
                        employee.getProfileImage(),
                        "CHECK_OUT",
                        now);
            }
            // If the latest record IS checked out, we fall through to create a NEW check-in
            // session
        }

        // Check in
        Attendance attendance = new Attendance();
        attendance.setEmployeeId(employee.getEmployeeId());
        attendance.setEmployeeName(employee.getFirstName() + " " + employee.getLastName());
        attendance.setDepartment(employee.getDepartment());
        attendance.setDate(today);
        attendance.setCheckIn(now);
        attendance.setCheckInType(type);
        attendance.setStatus(determineStatus(employee, now.toLocalTime()));
        attendance.setCreatedAt(now);
        attendance.setUpdatedAt(now);

        attendanceRepository.save(attendance);

        // Send notification if late
        if (attendance.getStatus() == Attendance.Status.LATE) {
            notificationService.notifyLateArrival(employee, now);
        }

        return new AttendanceDTO.MarkAttendanceResponse(
                "Checked in successfully",
                employee.getEmployeeId(),
                employee.getFirstName() + " " + employee.getLastName(),
                employee.getProfileImage(),
                "CHECK_IN",
                now);
    }

    private Attendance.Status determineStatus(Employee employee, LocalTime checkInTime) {
        if (employee.getShiftId() != null) {
            Optional<Shift> shiftOpt = shiftRepository.findById(employee.getShiftId());
            if (shiftOpt.isPresent()) {
                Shift shift = shiftOpt.get();
                LocalTime graceTime = shift.getGraceTime() != null ? shift.getGraceTime() : LocalTime.of(0, 15);
                LocalTime lateThreshold = shift.getStartTime().plusHours(graceTime.getHour())
                        .plusMinutes(graceTime.getMinute());

                if (checkInTime.isAfter(lateThreshold)) {
                    return Attendance.Status.LATE;
                }
            }
        }
        return Attendance.Status.PRESENT;
    }

    private double calculateWorkingHours(LocalDateTime checkIn, LocalDateTime checkOut) {
        Duration duration = Duration.between(checkIn, checkOut);
        return Math.round(duration.toMinutes() / 60.0 * 100.0) / 100.0;
    }

    private double calculateEuclideanDistance(List<Double> descriptor1, List<Double> descriptor2) {
        if (descriptor1.size() != descriptor2.size()) {
            return Double.MAX_VALUE;
        }

        double sum = 0;
        for (int i = 0; i < descriptor1.size(); i++) {
            double diff = descriptor1.get(i) - descriptor2.get(i);
            sum += diff * diff;
        }
        return Math.sqrt(sum);
    }

    public List<AttendanceDTO.AttendanceResponse> getTodayAttendance() {
        return attendanceRepository.findByDate(LocalDate.now()).stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    public List<AttendanceDTO.AttendanceResponse> getAttendanceByDate(LocalDate date) {
        return attendanceRepository.findByDate(date).stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    public List<AttendanceDTO.AttendanceResponse> getAttendanceByDateRange(LocalDate startDate, LocalDate endDate) {
        return attendanceRepository.findByDateBetween(startDate, endDate).stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    public List<AttendanceDTO.AttendanceResponse> getEmployeeAttendance(String employeeId) {
        return attendanceRepository.findByEmployeeId(employeeId).stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    public List<AttendanceDTO.AttendanceResponse> getEmployeeRecentAttendance(String employeeId, int limit) {
        Pageable pageable = PageRequest.of(0, limit, Sort.by(Sort.Direction.DESC, "date", "checkIn"));
        return attendanceRepository.findByEmployeeId(employeeId, pageable).stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    public List<AttendanceDTO.AttendanceResponse> getEmployeeAttendanceByDateRange(String employeeId,
            LocalDate startDate, LocalDate endDate) {
        return attendanceRepository.findByEmployeeIdAndDateBetween(employeeId, startDate, endDate).stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    public AttendanceDTO.AttendanceSummary getAttendanceSummary(LocalDate date) {
        long totalEmployees = employeeRepository.countByActiveTrue();
        List<Attendance> todaysAttendance = attendanceRepository.findByDate(date);

        // Count unique employee IDs for overall presence
        long presentCount = todaysAttendance.stream()
                .map(Attendance::getEmployeeId)
                .distinct()
                .count();

        // Count unique employees who were late or on leave
        long late = todaysAttendance.stream()
                .filter(a -> a.getStatus() == Attendance.Status.LATE)
                .map(Attendance::getEmployeeId)
                .distinct()
                .count();

        long onLeave = todaysAttendance.stream()
                .filter(a -> a.getStatus() == Attendance.Status.ON_LEAVE)
                .map(Attendance::getEmployeeId)
                .distinct()
                .count();

        long absent = totalEmployees - presentCount;

        double percentage = totalEmployees > 0 ? (presentCount) * 100.0 / totalEmployees : 0;

        return new AttendanceDTO.AttendanceSummary(
                date, totalEmployees, presentCount, absent, late, onLeave, Math.round(percentage * 100.0) / 100.0);
    }

    public AttendanceDTO.AttendanceResponse getEmployeeTodayAttendance(String employeeId) {
        return attendanceRepository.findFirstByEmployeeIdAndDateOrderByCheckInDesc(employeeId, LocalDate.now())
                .map(this::mapToResponse)
                .orElse(null);
    }

    public AttendanceDTO.AttendanceResponse getEmployeeTodayAttendanceByUserId(String userId) {
        Optional<Employee> employeeOpt = employeeRepository.findByUserId(userId);
        if (employeeOpt.isEmpty()) {
            return null; // User doesn't have an employee record
        }
        return getEmployeeTodayAttendance(employeeOpt.get().getEmployeeId());
    }

    private AttendanceDTO.AttendanceResponse mapToResponse(Attendance attendance) {
        AttendanceDTO.AttendanceResponse response = new AttendanceDTO.AttendanceResponse();
        response.setId(attendance.getId());
        response.setEmployeeId(attendance.getEmployeeId());
        response.setEmployeeName(attendance.getEmployeeName());
        response.setDepartment(attendance.getDepartment());
        response.setDate(attendance.getDate());
        response.setCheckIn(attendance.getCheckIn());
        response.setCheckOut(attendance.getCheckOut());
        response.setCheckInType(attendance.getCheckInType());
        response.setCheckOutType(attendance.getCheckOutType());
        response.setStatus(attendance.getStatus());
        response.setWorkingHours(attendance.getWorkingHours());
        response.setNotes(attendance.getNotes());
        return response;
    }
}
