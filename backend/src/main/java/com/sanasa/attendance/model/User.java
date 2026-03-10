package com.sanasa.attendance.model;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.index.Indexed;

import java.time.LocalDateTime;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "users")
public class User {
    @Id
    private String id;

    @Indexed(unique = true)
    private String email;

    private String password;
    private String firstName;
    private String lastName;
    private Role role;
    private String phone;
    private String department;
    private String designation;
    private String profileImage;
    private boolean active = true;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    private String resetPasswordToken;
    private LocalDateTime resetPasswordTokenExpiry;

    public enum Role {
        SUPER_ADMIN,
        ADMIN,
        STAFF_ADMIN,
        EMPLOYEE
    }
}
