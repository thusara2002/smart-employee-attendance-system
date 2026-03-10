package com.sanasa.attendance.service;

import com.sanasa.attendance.dto.AuthDTO;
import com.sanasa.attendance.model.Employee;
import com.sanasa.attendance.model.User;
import com.sanasa.attendance.repository.EmployeeRepository;
import com.sanasa.attendance.repository.UserRepository;
import com.sanasa.attendance.security.JwtTokenProvider;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.UUID;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final EmployeeRepository employeeRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider jwtTokenProvider;
    private final EmailService emailService;

    public AuthService(UserRepository userRepository, EmployeeRepository employeeRepository,
            PasswordEncoder passwordEncoder, JwtTokenProvider jwtTokenProvider,
            EmailService emailService) {
        this.userRepository = userRepository;
        this.employeeRepository = employeeRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtTokenProvider = jwtTokenProvider;
        this.emailService = emailService;
    }

    public AuthDTO.AuthResponse login(AuthDTO.LoginRequest request) {
        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new RuntimeException("Invalid email or password"));

        if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            throw new RuntimeException("Invalid email or password");
        }

        if (!user.isActive()) {
            throw new RuntimeException("Account is deactivated");
        }

        String token = jwtTokenProvider.generateToken(user.getId(), user.getEmail(), user.getRole().name());

        // Look up employee record to get employeeId
        String employeeId = employeeRepository.findByUserId(user.getId())
                .map(emp -> emp.getEmployeeId())
                .orElse(null);

        return new AuthDTO.AuthResponse(
                token,
                user.getId(),
                user.getEmail(),
                user.getFirstName(),
                user.getLastName(),
                user.getRole().name(),
                user.getProfileImage(),
                employeeId);
    }

    public AuthDTO.AuthResponse register(AuthDTO.RegisterRequest request) {
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new RuntimeException("Email already exists");
        }

        User user = new User();
        user.setEmail(request.getEmail());
        user.setPassword(passwordEncoder.encode(request.getPassword()));
        user.setFirstName(request.getFirstName());
        user.setLastName(request.getLastName());
        user.setPhone(request.getPhone());
        user.setDepartment(request.getDepartment());
        user.setDesignation(request.getDesignation());
        user.setRole(request.getRole());
        user.setActive(true);
        user.setCreatedAt(LocalDateTime.now());
        user.setUpdatedAt(LocalDateTime.now());

        user = userRepository.save(user);

        // Create employee record if role is EMPLOYEE
        String employeeId = null;
        if (user.getRole() == User.Role.EMPLOYEE) {
            Employee employee = new Employee();
            employeeId = "EMP" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
            employee.setEmployeeId(employeeId);
            employee.setUserId(user.getId());
            employee.setEmail(user.getEmail());
            employee.setFirstName(user.getFirstName());
            employee.setLastName(user.getLastName());
            employee.setPhone(user.getPhone());
            employee.setDepartment(user.getDepartment());
            employee.setDesignation(user.getDesignation());
            employee.setQrCode(UUID.randomUUID().toString());
            employee.setActive(true);
            employee.setCreatedAt(LocalDateTime.now());
            employee.setUpdatedAt(LocalDateTime.now());
            employeeRepository.save(employee);
        }

        String token = jwtTokenProvider.generateToken(user.getId(), user.getEmail(), user.getRole().name());

        return new AuthDTO.AuthResponse(
                token,
                user.getId(),
                user.getEmail(),
                user.getFirstName(),
                user.getLastName(),
                user.getRole().name(),
                user.getProfileImage(),
                employeeId);
    }

    public AuthDTO.UserResponse getCurrentUser(String userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        return new AuthDTO.UserResponse(
                user.getId(),
                user.getEmail(),
                user.getFirstName(),
                user.getLastName(),
                user.getPhone(),
                user.getDepartment(),
                user.getDesignation(),
                user.getRole().name(),
                user.getProfileImage(),
                user.isActive());
    }

    public AuthDTO.AuthResponse createStaffAccount(User currentUser, AuthDTO.CreateStaffRequest request) {
        // Validate that current user has permission
        if (currentUser.getRole() != User.Role.SUPER_ADMIN) {
            throw new RuntimeException("You don't have permission to create staff accounts");
        }

        // Parse the requested role
        User.Role requestedRole;
        try {
            requestedRole = User.Role.valueOf(request.getRole().toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new RuntimeException("Invalid role: " + request.getRole());
        }

        // Validate role permissions
        if (requestedRole == User.Role.SUPER_ADMIN) {
            throw new RuntimeException("Cannot create Super Admin accounts");
        }

        if (currentUser.getRole() == User.Role.ADMIN && requestedRole == User.Role.ADMIN) {
            throw new RuntimeException("HR staff cannot create other HR accounts. Only Admin can do this.");
        }

        if (userRepository.existsByEmail(request.getEmail())) {
            throw new RuntimeException("Email already exists");
        }

        // Create the user
        User user = new User();
        user.setEmail(request.getEmail());
        user.setPassword(passwordEncoder.encode(request.getPassword()));
        user.setFirstName(request.getFirstName());
        user.setLastName(request.getLastName());
        user.setPhone(request.getPhone());
        user.setDepartment(request.getDepartment());
        user.setDesignation(request.getDesignation());
        user.setRole(requestedRole);
        user.setActive(true);
        user.setCreatedAt(LocalDateTime.now());
        user.setUpdatedAt(LocalDateTime.now());

        user = userRepository.save(user);

        // Create employee record if role is EMPLOYEE
        String employeeId = null;
        if (requestedRole == User.Role.EMPLOYEE) {
            Employee employee = new Employee();
            employeeId = "EMP" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
            employee.setEmployeeId(employeeId);
            employee.setUserId(user.getId());
            employee.setEmail(user.getEmail());
            employee.setFirstName(user.getFirstName());
            employee.setLastName(user.getLastName());
            employee.setPhone(user.getPhone());
            employee.setDepartment(user.getDepartment());
            employee.setDesignation(user.getDesignation());
            employee.setQrCode(UUID.randomUUID().toString());
            employee.setActive(true);
            employee.setCreatedAt(LocalDateTime.now());
            employee.setUpdatedAt(LocalDateTime.now());
            employeeRepository.save(employee);
        }

        String token = jwtTokenProvider.generateToken(user.getId(), user.getEmail(), user.getRole().name());

        return new AuthDTO.AuthResponse(
                token,
                user.getId(),
                user.getEmail(),
                user.getFirstName(),
                user.getLastName(),
                user.getRole().name(),
                user.getProfileImage(),
                employeeId);
    }

    public void changePassword(String userId, AuthDTO.ChangePasswordRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        if (!passwordEncoder.matches(request.getOldPassword(), user.getPassword())) {
            throw new RuntimeException("Incorrect old password");
        }

        user.setPassword(passwordEncoder.encode(request.getNewPassword()));
        user.setUpdatedAt(LocalDateTime.now());
        userRepository.save(user);
    }

    public void updateProfile(String userId, AuthDTO.UpdateProfileRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        user.setFirstName(request.getFirstName());
        user.setLastName(request.getLastName());
        user.setPhone(request.getPhone());
        user.setDepartment(request.getDepartment());
        user.setDesignation(request.getDesignation());
        user.setUpdatedAt(LocalDateTime.now());

        userRepository.save(user);

        // Update employee record if it exists
        employeeRepository.findByUserId(userId).ifPresent(employee -> {
            employee.setFirstName(request.getFirstName());
            employee.setLastName(request.getLastName());
            employee.setPhone(request.getPhone());
            employee.setDepartment(request.getDepartment());
            employee.setDesignation(request.getDesignation());
            employee.setUpdatedAt(LocalDateTime.now());
            employeeRepository.save(employee);
        });
    }

    public void uploadProfileImage(String userId, String profileImage) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        user.setProfileImage(profileImage);
        user.setUpdatedAt(LocalDateTime.now());
        userRepository.save(user);

        // Update employee record too
        employeeRepository.findByUserId(userId).ifPresent(employee -> {
            employee.setProfileImage(profileImage);
            employee.setUpdatedAt(LocalDateTime.now());
            employeeRepository.save(employee);
        });
    }

    public void forgotPassword(AuthDTO.ForgotPasswordRequest request) {
        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new RuntimeException("User not found with email: " + request.getEmail()));

        String token = UUID.randomUUID().toString();
        user.setResetPasswordToken(token);
        user.setResetPasswordTokenExpiry(LocalDateTime.now().plusHours(1));
        userRepository.save(user);

        emailService.sendPasswordResetEmail(user.getEmail(), token);
    }

    public void resetPassword(AuthDTO.ResetPasswordRequest request) {
        User user = userRepository.findByResetPasswordToken(request.getToken())
                .orElseThrow(() -> new RuntimeException("Invalid or expired reset token"));

        if (user.getResetPasswordTokenExpiry().isBefore(LocalDateTime.now())) {
            throw new RuntimeException("Reset token has expired");
        }

        user.setPassword(passwordEncoder.encode(request.getNewPassword()));
        user.setResetPasswordToken(null);
        user.setResetPasswordTokenExpiry(null);
        user.setUpdatedAt(LocalDateTime.now());
        userRepository.save(user);
    }
}
