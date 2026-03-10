package com.sanasa.attendance.service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import com.sanasa.attendance.dto.EmployeeDTO;
import com.sanasa.attendance.model.Employee;
import com.sanasa.attendance.model.User;
import com.sanasa.attendance.repository.EmployeeRepository;
import com.sanasa.attendance.repository.ShiftRepository;
import com.sanasa.attendance.repository.UserRepository;

@Service
public class EmployeeService {

    private final EmployeeRepository employeeRepository;
    private final UserRepository userRepository;
    private final ShiftRepository shiftRepository;
    private final PasswordEncoder passwordEncoder;

    public EmployeeService(EmployeeRepository employeeRepository, UserRepository userRepository,
            ShiftRepository shiftRepository, PasswordEncoder passwordEncoder) {
        this.employeeRepository = employeeRepository;
        this.userRepository = userRepository;
        this.shiftRepository = shiftRepository;
        this.passwordEncoder = passwordEncoder;
    }

    public EmployeeDTO.EmployeeResponse createEmployee(EmployeeDTO.CreateRequest request) {
        if (employeeRepository.existsByEmail(request.getEmail())) {
            throw new RuntimeException("Email already exists");
        }

        // Auto-generate employee ID
        String employeeId = "EMP" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
        while (employeeRepository.existsByEmployeeId(employeeId)) {
            employeeId = "EMP" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
        }

        // Create user account
        User user = new User();
        user.setEmail(request.getEmail());
        user.setPassword(passwordEncoder.encode(request.getPassword()));
        user.setFirstName(request.getFirstName());
        user.setLastName(request.getLastName());
        user.setPhone(request.getPhone());
        user.setDepartment(request.getDepartment());
        user.setDesignation(request.getDesignation());
        user.setRole(User.Role.EMPLOYEE);
        user.setActive(true);
        user.setCreatedAt(LocalDateTime.now());
        user.setUpdatedAt(LocalDateTime.now());
        user = userRepository.save(user);

        // Create employee record
        Employee employee = new Employee();
        employee.setEmployeeId(employeeId);
        employee.setUserId(user.getId());
        employee.setEmail(request.getEmail());
        employee.setFirstName(request.getFirstName());
        employee.setLastName(request.getLastName());
        employee.setPhone(request.getPhone());
        employee.setDepartment(request.getDepartment());
        employee.setDesignation(request.getDesignation());
        employee.setShiftId(request.getShiftId());
        employee.setQrCode(UUID.randomUUID().toString());
        employee.setJoiningDate(request.getJoiningDate());
        employee.setActive(true);
        employee.setCreatedAt(LocalDateTime.now());
        employee.setUpdatedAt(LocalDateTime.now());

        employee = employeeRepository.save(employee);

        return mapToResponse(employee);
    }

    public List<EmployeeDTO.EmployeeResponse> getAllEmployees() {
        List<Employee> employees = employeeRepository.findAll();
        return mapToResponseList(employees);
    }

    public List<EmployeeDTO.EmployeeResponse> getActiveEmployees() {
        List<Employee> employees = employeeRepository.findByActiveTrue();
        return mapToResponseList(employees);
    }

    public long getActiveEmployeeCount() {
        return employeeRepository.countByActiveTrue();
    }

    public EmployeeDTO.EmployeeResponse getEmployeeById(String id) {
        Employee employee = employeeRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Employee not found"));
        return mapToResponse(employee);
    }

    public EmployeeDTO.EmployeeResponse getEmployeeByEmployeeId(String employeeId) {
        Employee employee = employeeRepository.findByEmployeeId(employeeId)
                .orElseThrow(() -> new RuntimeException("Employee not found"));
        return mapToResponse(employee);
    }

    public EmployeeDTO.EmployeeResponse getEmployeeByUserId(String userId) {
        Employee employee = employeeRepository.findByUserId(userId)
                .orElseThrow(() -> new RuntimeException("Employee record not found"));
        return mapToResponse(employee);
    }

    public EmployeeDTO.EmployeeResponse updateEmployee(String id, EmployeeDTO.UpdateRequest request) {
        Employee employee = employeeRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Employee not found"));

        if (request.getFirstName() != null)
            employee.setFirstName(request.getFirstName());
        if (request.getLastName() != null)
            employee.setLastName(request.getLastName());
        if (request.getPhone() != null)
            employee.setPhone(request.getPhone());
        if (request.getDepartment() != null)
            employee.setDepartment(request.getDepartment());
        if (request.getDesignation() != null)
            employee.setDesignation(request.getDesignation());
        if (request.getShiftId() != null)
            employee.setShiftId(request.getShiftId());
        employee.setActive(request.isActive());
        employee.setUpdatedAt(LocalDateTime.now());

        employee = employeeRepository.save(employee);

        // Update user record as well
        userRepository.findById(employee.getUserId()).ifPresent(user -> {
            if (request.getFirstName() != null)
                user.setFirstName(request.getFirstName());
            if (request.getLastName() != null)
                user.setLastName(request.getLastName());
            if (request.getPhone() != null)
                user.setPhone(request.getPhone());
            if (request.getDepartment() != null)
                user.setDepartment(request.getDepartment());
            if (request.getDesignation() != null)
                user.setDesignation(request.getDesignation());
            user.setActive(request.isActive());
            if (request.getRole() != null) {
                try {
                    user.setRole(User.Role.valueOf(request.getRole().toUpperCase()));
                } catch (IllegalArgumentException e) {
                    // Ignore invalid role
                }
            }
            user.setUpdatedAt(LocalDateTime.now());
            userRepository.save(user);
        });

        return mapToResponse(employee);
    }

    public void deleteEmployee(String id) {
        Employee employee = employeeRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Employee not found"));

        // Soft delete - just deactivate
        employee.setActive(false);
        employee.setUpdatedAt(LocalDateTime.now());
        employeeRepository.save(employee);

        userRepository.findById(employee.getUserId()).ifPresent(user -> {
            user.setActive(false);
            user.setUpdatedAt(LocalDateTime.now());
            userRepository.save(user);
        });
    }

    public EmployeeDTO.EmployeeResponse registerFace(EmployeeDTO.FaceRegistrationRequest request) {
        Employee employee = employeeRepository.findByEmployeeId(request.getEmployeeId())
                .orElseThrow(() -> new RuntimeException("Employee not found"));

        // Handle new multi-descriptor format
        if (request.getPrimaryDescriptor() != null && !request.getPrimaryDescriptor().isEmpty()) {
            employee.setFaceDescriptor(request.getPrimaryDescriptor());
        } else if (request.getFaceDescriptor() != null && !request.getFaceDescriptor().isEmpty()) {
            // Legacy support for single descriptor
            employee.setFaceDescriptor(request.getFaceDescriptor());
        }

        // Store all descriptors for improved matching accuracy
        if (request.getAllDescriptors() != null && !request.getAllDescriptors().isEmpty()) {
            employee.setFaceDescriptors(request.getAllDescriptors());
            employee.setFaceCaptureCount(request.getAllDescriptors().size());
        } else if (request.getCaptureCount() != null) {
            employee.setFaceCaptureCount(request.getCaptureCount());
        } else {
            employee.setFaceCaptureCount(1);
        }

        employee.setFaceRegistered(true);
        employee.setFaceRegisteredAt(LocalDateTime.now());
        employee.setUpdatedAt(LocalDateTime.now());

        employee = employeeRepository.save(employee);
        return mapToResponse(employee);
    }

    public EmployeeDTO.EmployeeResponse uploadProfileImage(String id, String profileImage) {
        Employee employee = employeeRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Employee not found"));

        employee.setProfileImage(profileImage);
        employee.setUpdatedAt(LocalDateTime.now());
        employee = employeeRepository.save(employee);

        return mapToResponse(employee);
    }

    private List<EmployeeDTO.EmployeeResponse> mapToResponseList(List<Employee> employees) {
        // Batch fetch all users and shifts to avoid N+1 problem
        List<String> userIds = employees.stream().map(Employee::getUserId).collect(Collectors.toList());
        List<String> shiftIds = employees.stream()
                .map(Employee::getShiftId)
                .filter(java.util.Objects::nonNull)
                .distinct()
                .collect(Collectors.toList());

        java.util.Map<String, User> userMap = userRepository.findAllById((java.lang.Iterable<String>) userIds).stream()
                .collect(java.util.stream.Collectors.toMap(User::getId, u -> u));

        java.util.Map<String, com.sanasa.attendance.model.Shift> shiftMap = shiftRepository
                .findAllById((java.lang.Iterable<String>) shiftIds)
                .stream()
                .collect(java.util.stream.Collectors.toMap(com.sanasa.attendance.model.Shift::getId, s -> s));

        return employees.stream()
                .map(e -> mapToResponse(e, userMap.get(e.getUserId()), shiftMap.get(e.getShiftId())))
                .collect(Collectors.toList());
    }

    private EmployeeDTO.EmployeeResponse mapToResponse(Employee employee) {
        User user = userRepository.findById(employee.getUserId()).orElse(null);
        com.sanasa.attendance.model.Shift shift = employee.getShiftId() != null
                ? shiftRepository.findById(employee.getShiftId()).orElse(null)
                : null;
        return mapToResponse(employee, user, shift);
    }

    private EmployeeDTO.EmployeeResponse mapToResponse(Employee employee, User user,
            com.sanasa.attendance.model.Shift shift) {
        EmployeeDTO.EmployeeResponse response = new EmployeeDTO.EmployeeResponse();
        response.setId(employee.getId());
        response.setEmployeeId(employee.getEmployeeId());
        response.setUserId(employee.getUserId());
        response.setEmail(employee.getEmail());
        response.setFirstName(employee.getFirstName());
        response.setLastName(employee.getLastName());
        response.setPhone(employee.getPhone());
        response.setDepartment(employee.getDepartment());
        response.setDesignation(employee.getDesignation());
        response.setProfileImage(employee.getProfileImage());
        response.setFaceRegistered(employee.isFaceRegistered());
        response.setQrCode(employee.getQrCode());
        response.setShiftId(employee.getShiftId());
        response.setActive(employee.isActive());
        response.setJoiningDate(employee.getJoiningDate());

        if (user != null) {
            response.setRole(user.getRole().name());
        }

        response.setCreatedAt(employee.getCreatedAt());

        if (shift != null) {
            response.setShiftName(shift.getName());
        }

        return response;
    }
}
