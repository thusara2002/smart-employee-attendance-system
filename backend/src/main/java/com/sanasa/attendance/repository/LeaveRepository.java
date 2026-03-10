package com.sanasa.attendance.repository;

import com.sanasa.attendance.model.Leave;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;
import org.springframework.stereotype.Repository;

import org.springframework.data.domain.Pageable;
import java.time.LocalDate;
import java.util.List;

@Repository
public interface LeaveRepository extends MongoRepository<Leave, String> {
    List<Leave> findByEmployeeId(String employeeId);

    List<Leave> findByEmployeeId(String employeeId, Pageable pageable);

    List<Leave> findByStatus(Leave.Status status);

    List<Leave> findByEmployeeIdAndStatus(String employeeId, Leave.Status status);

    @Query("{'employeeId': ?0, 'startDate': {$lte: ?1}, 'endDate': {$gte: ?1}}")
    List<Leave> findByEmployeeIdAndDateInRange(String employeeId, LocalDate date);

    @Query("{'status': 'PENDING'}")
    List<Leave> findPendingLeaves();

    List<Leave> findByDepartment(String department);

    List<Leave> findByDepartmentAndStatus(String department, Leave.Status status);
}
