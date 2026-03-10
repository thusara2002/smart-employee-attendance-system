package com.sanasa.attendance.repository;

import com.sanasa.attendance.model.Attendance;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;
import org.springframework.stereotype.Repository;

import org.springframework.data.domain.Pageable;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface AttendanceRepository extends MongoRepository<Attendance, String> {
    List<Attendance> findByEmployeeId(String employeeId);

    List<Attendance> findByEmployeeId(String employeeId, Pageable pageable);

    List<Attendance> findByDate(LocalDate date);

    List<Attendance> findByEmployeeIdAndDate(String employeeId, LocalDate date);

    Optional<Attendance> findFirstByEmployeeIdAndDateOrderByCheckInDesc(String employeeId, LocalDate date);

    @Query("{'date': {$gte: ?0, $lte: ?1}}")
    List<Attendance> findByDateBetween(LocalDate startDate, LocalDate endDate);

    @Query("{'employeeId': ?0, 'date': {$gte: ?1, $lte: ?2}}")
    List<Attendance> findByEmployeeIdAndDateBetween(String employeeId, LocalDate startDate, LocalDate endDate);

    List<Attendance> findByDepartmentAndDate(String department, LocalDate date);

    @Query("{'status': ?0, 'date': ?1}")
    List<Attendance> findByStatusAndDate(Attendance.Status status, LocalDate date);

    long countByDateAndStatus(LocalDate date, Attendance.Status status);

    long countByDate(LocalDate date);
}
