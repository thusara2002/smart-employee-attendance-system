package com.sanasa.attendance.config;

import com.sanasa.attendance.model.User;
import com.sanasa.attendance.repository.UserRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;

@Component
public class DataInitializer implements CommandLineRunner {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public DataInitializer(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public void run(String... args) {
        // Create admin user if not exists
        String adminEmail = "admin123@sanasa.com";

        if (!userRepository.existsByEmail(adminEmail)) {
            User admin = new User();
            admin.setEmail(adminEmail);
            admin.setPassword(passwordEncoder.encode("Admin@123"));
            admin.setFirstName("Super");
            admin.setLastName("Admin");
            admin.setRole(User.Role.SUPER_ADMIN);
            admin.setActive(true);
            admin.setCreatedAt(LocalDateTime.now());
            admin.setUpdatedAt(LocalDateTime.now());

            userRepository.save(admin);
            System.out.println("✅ Admin user created: " + adminEmail + " / Admin@123");
        } else {
            // Update existing admin user name if it doesn't match
            userRepository.findByEmail(adminEmail).ifPresent(admin -> {
                if (!"Super".equals(admin.getFirstName()) || !"Admin".equals(admin.getLastName())) {
                    admin.setFirstName("Super");
                    admin.setLastName("Admin");
                    admin.setUpdatedAt(LocalDateTime.now());
                    userRepository.save(admin);
                    System.out.println("✅ Admin user name updated to: Super Admin");
                } else {
                    System.out.println("ℹ️ Admin user already exists: " + adminEmail);
                }
            });
        }
    }
}
