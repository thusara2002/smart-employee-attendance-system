package com.sanasa.attendance.repository;

import com.sanasa.attendance.model.Employee;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface EmployeeRepository extends MongoRepository<Employee, String> {
    Optional<Employee> findByEmployeeId(String employeeId);

    Optional<Employee> findByEmail(String email);

    Optional<Employee> findByUserId(String userId);

    Optional<Employee> findByQrCode(String qrCode);

    boolean existsByEmployeeId(String employeeId);

    boolean existsByEmail(String email);

    List<Employee> findByDepartment(String department);

    List<Employee> findByActiveTrue();

    long countByActiveTrue();

    List<Employee> findByShiftId(String shiftId);

    List<Employee> findByFaceRegisteredTrue();
}
